package com.marketing2advertising.ipshield

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.net.VpnService
import android.os.Bundle
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import com.wireguard.android.backend.GoBackend
import com.wireguard.android.backend.Tunnel
import com.wireguard.config.Config
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : Activity() {
    private lateinit var backend: GoBackend
    private lateinit var statusView: TextView
    private lateinit var ipView: TextView
    private lateinit var profileView: TextView
    private lateinit var importButton: Button
    private lateinit var connectButton: Button
    private lateinit var disconnectButton: Button

    private var importedConfig: Config? = null
    private var isBusy = false

    private val tunnel = object : Tunnel {
        override fun getName(): String = "M2A-IP-Shield"

        override fun onStateChange(newState: Tunnel.State) {
            runOnUiThread {
                setStatus("WireGuard engine state: $newState")
                updateControls()
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        backend = GoBackend(this)
        buildScreen()
        updateControls()
    }

    private fun buildScreen() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(24), dp(28), dp(24), dp(24))
            setBackgroundColor(Color.rgb(9, 15, 28))
        }

        val brand = TextView(this).apply {
            text = "M2A IP SHIELD"
            textSize = 13f
            setTextColor(Color.rgb(124, 255, 0))
        }
        root.addView(brand)

        val title = TextView(this).apply {
            text = "My Private Server"
            textSize = 27f
            setTextColor(Color.WHITE)
            setPadding(0, dp(10), 0, dp(6))
        }
        root.addView(title)

        val intro = TextView(this).apply {
            text = "Connect to your own WireGuard server. Your profile is parsed locally and is not uploaded to M2A."
            textSize = 14f
            setTextColor(Color.rgb(185, 197, 215))
        }
        root.addView(intro)

        profileView = makeInfo("No WireGuard profile imported")
        root.addView(profileView)

        statusView = makeInfo("Status: Disconnected")
        root.addView(statusView)

        ipView = makeInfo("Public IP after connection: Not checked")
        root.addView(ipView)

        importButton = makeButton("Choose WireGuard .conf file") {
            try {
                val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "*/*"
                    putExtra(
                        Intent.EXTRA_MIME_TYPES,
                        arrayOf("text/plain", "application/octet-stream", "application/conf")
                    )
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                startActivityForResult(intent, REQUEST_PROFILE)
                setStatus("Choose the .conf file supplied by your WireGuard server or VPN provider.")
            } catch (_: Exception) {
                setStatus("Could not open the Android file picker. Please try again or use your device's Files app.")
            }
        }
        root.addView(importButton, buttonParams())

        connectButton = makeButton("Connect") {
            if (importedConfig == null) {
                setStatus("Import a valid WireGuard .conf file before connecting.")
            } else {
                requestVpnPermissionAndConnect()
            }
        }
        root.addView(connectButton, buttonParams())

        disconnectButton = makeButton("Disconnect") { disconnectTunnel() }
        root.addView(disconnectButton, buttonParams())

        val note = TextView(this).apply {
            text = "This early native client imports a personal WireGuard profile. The independent IP check contacts api.ipify.org, which receives your public IP. M2A Free Network, QR import, native kill-switch guidance, and full verification are not enabled yet."
            textSize = 12f
            setTextColor(Color.rgb(160, 174, 196))
            setPadding(0, dp(22), 0, 0)
        }
        root.addView(note)

        setContentView(root)
    }

    private fun makeInfo(value: String): TextView = TextView(this).apply {
        text = value
        textSize = 13f
        setTextColor(Color.rgb(220, 228, 240))
        setPadding(0, dp(18), 0, dp(6))
    }

    private fun makeButton(label: String, action: () -> Unit): Button =
        Button(this).apply {
            text = label
            isAllCaps = false
            setOnClickListener { action() }
        }

    private fun buttonParams() = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.WRAP_CONTENT
    ).apply {
        topMargin = dp(10)
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    @Deprecated("Use the Activity Result API in the next UI integration pass")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)

        when (requestCode) {
            REQUEST_PROFILE -> {
                if (resultCode != RESULT_OK) {
                    setStatus("No profile selected. Choose a WireGuard .conf file to enable Connect.")
                    updateControls()
                    return
                }

                val uri = data?.data
                if (uri == null) {
                    profileView.text = "No file was selected."
                    setStatus("Import cancelled because Android did not return a file.")
                    updateControls()
                    return
                }

                try {
                    val parsed = contentResolver.openInputStream(uri)?.use { stream ->
                        Config.parse(stream)
                    } ?: throw IllegalStateException("Android could not open the selected file.")

                    importedConfig = parsed
                    val displayName = runCatching {
                        contentResolver.query(uri, arrayOf(android.provider.OpenableColumns.DISPLAY_NAME), null, null, null)
                            ?.use { cursor ->
                                if (cursor.moveToFirst()) cursor.getString(0) else null
                            }
                    }.getOrNull()?.take(80) ?: "WireGuard profile"

                    profileView.text = "$displayName imported successfully. Profile is held in memory only."
                    setStatus("Profile imported and parsed. Tap Connect, then approve Android's VPN permission.")
                } catch (error: Exception) {
                    importedConfig = null
                    profileView.text = "No WireGuard profile imported. Select a valid WireGuard .conf file."
                    val reason = error.localizedMessage?.take(140)?.takeIf { it.isNotBlank() }
                    setStatus(
                        if (reason != null) "Import failed: $reason"
                        else "Import failed. This file is not a readable, valid WireGuard configuration."
                    )
                }
                updateControls()
            }

            REQUEST_VPN_PERMISSION -> {
                if (resultCode == RESULT_OK) {
                    startTunnel()
                } else {
                    setStatus("VPN permission was not granted. No tunnel was started.")
                    isBusy = false
                    updateControls()
                }
            }
        }
    }

    private fun requestVpnPermissionAndConnect() {
        if (importedConfig == null || isBusy) return
        val permissionIntent = VpnService.prepare(this)
        if (permissionIntent != null) {
            startActivityForResult(permissionIntent, REQUEST_VPN_PERMISSION)
        } else {
            startTunnel()
        }
    }

    private fun startTunnel() {
        val config = importedConfig ?: return
        isBusy = true
        setStatus("Starting native WireGuard tunnel…")
        updateControls()

        Thread {
            try {
                val state = backend.setState(tunnel, Tunnel.State.UP, config)
                if (state != Tunnel.State.UP || backend.getState(tunnel) != Tunnel.State.UP) {
                    throw IllegalStateException("WireGuard did not report an active tunnel.")
                }
                runOnUiThread {
                    isBusy = false
                    setStatus("WireGuard reports UP. Checking the public IP observed by this device…")
                    updateControls()
                }
                checkPublicIp()
            } catch (_: Exception) {
                runOnUiThread {
                    isBusy = false
                    setStatus("Connection failed. Check the profile, server availability, and VPN permission.")
                    updateControls()
                }
            }
        }.start()
    }

    private fun disconnectTunnel() {
        if (isBusy) return
        isBusy = true
        setStatus("Stopping WireGuard tunnel…")
        updateControls()
        Thread {
            try {
                backend.setState(tunnel, Tunnel.State.DOWN, null)
                runOnUiThread {
                    isBusy = false
                    ipView.text = "Public IP after connection: Not checked"
                    setStatus("Disconnected")
                    updateControls()
                }
            } catch (_: Exception) {
                runOnUiThread {
                    isBusy = false
                    setStatus("Unable to confirm disconnect. Check Android VPN settings.")
                    updateControls()
                }
            }
        }.start()
    }

    private fun checkPublicIp() {
        Thread {
            var connection: HttpURLConnection? = null
            try {
                connection = (URL("https://api.ipify.org?format=json").openConnection() as HttpURLConnection).apply {
                    connectTimeout = 6000
                    readTimeout = 6000
                    setRequestProperty("Cache-Control", "no-store")
                }
                val body = connection.inputStream.bufferedReader().use { it.readText() }
                val ip = JSONObject(body).optString("ip", "Unavailable")
                runOnUiThread {
                    ipView.text = "Public IP observed after connection: $ip"
                    setStatus("WireGuard tunnel is UP. Confirm this exit IP matches your server's expected address.")
                }
            } catch (_: Exception) {
                runOnUiThread {
                    ipView.text = "Public IP after connection: Check unavailable"
                    setStatus("WireGuard reports UP, but the independent public-IP check failed.")
                }
            } finally {
                connection?.disconnect()
            }
        }.start()
    }

    private fun setStatus(message: String) {
        statusView.text = "Status: $message"
    }

    private fun updateControls() {
        val isUp = runCatching { backend.getState(tunnel) == Tunnel.State.UP }.getOrDefault(false)
        importButton.isEnabled = !isBusy && !isUp
        connectButton.isEnabled = !isBusy && !isUp && importedConfig != null
        connectButton.text = if (importedConfig == null) "Import a profile to enable Connect" else "Connect"
        disconnectButton.isEnabled = !isBusy && isUp
    }

    companion object {
        private const val REQUEST_PROFILE = 2101
        private const val REQUEST_VPN_PERMISSION = 2102
    }
}
