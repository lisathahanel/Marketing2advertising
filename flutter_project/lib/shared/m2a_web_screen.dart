// ignore: deprecated_member_use
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';

const String m2aWebsiteUrl = 'https://marketing2advertising.com';

/// The app's content stays on the live M2A website. This keeps articles,
/// entertainment, navigation and website updates in one source of truth.
bool isM2AWebsiteUri(Uri uri) {
  final host = uri.host.toLowerCase();
  return uri.scheme == 'https' &&
      (host == 'marketing2advertising.com' ||
          host == 'www.marketing2advertising.com');
}

class M2AWebScreen extends StatefulWidget {
  const M2AWebScreen({super.key});

  @override
  State<M2AWebScreen> createState() => _M2AWebScreenState();
}

class _M2AWebScreenState extends State<M2AWebScreen> {
  late final WebViewController _controller;
  int _progress = 0;
  bool _hasError = false;
  bool _canGoBack = false;

  @override
  void initState() {
    super.initState();
    SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
      statusBarColor: Color(0xFF070B12),
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Color(0xFF070B12),
      systemNavigationBarIconBrightness: Brightness.light,
    ));

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF070B12))
      ..setNavigationDelegate(
        NavigationDelegate(
          onNavigationRequest: (request) {
            final uri = Uri.tryParse(request.url);
            if (uri == null) return NavigationDecision.prevent;

            if (isM2AWebsiteUri(uri)) {
              return NavigationDecision.navigate;
            }

            // Keep external destinations outside the app's trusted web origin.
            unawaited(_openExternal(uri));
            return NavigationDecision.prevent;
          },
          onProgress: (progress) {
            if (!mounted) return;
            setState(() => _progress = progress);
          },
          onPageStarted: (_) {
            if (!mounted) return;
            setState(() {
              _hasError = false;
              _progress = 0;
            });
            _refreshBackState();
          },
          onPageFinished: (_) {
            if (!mounted) return;
            setState(() => _progress = 100);
            _refreshBackState();
          },
          onWebResourceError: (error) {
            if (error.isForMainFrame == true && mounted) {
              setState(() => _hasError = true);
            }
          },
        ),
      )
      ..loadRequest(Uri.parse(m2aWebsiteUrl));
  }

  Future<void> _openExternal(Uri uri) async {
    try {
      if (uri.scheme == 'http' || uri.scheme == 'https' ||
          uri.scheme == 'mailto' || uri.scheme == 'tel') {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } catch (_) {
      // A missing external handler should not interrupt the M2A website.
    }
  }

  Future<void> _refreshBackState() async {
    try {
      final canGoBack = await _controller.canGoBack();
      if (mounted && canGoBack != _canGoBack) {
        setState(() => _canGoBack = canGoBack);
      }
    } catch (_) {
      // WebView may not yet have a committed page.
    }
  }

  Future<void> _reload() async {
    if (!mounted) return;
    setState(() {
      _hasError = false;
      _progress = 0;
    });
    await _controller.reload();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope<Object?>(
      canPop: !_canGoBack,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop && _canGoBack) {
          _controller.goBack();
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFF070B12),
        body: SafeArea(
          top: false,
          bottom: false,
          child: Stack(
            children: [
              if (!_hasError) WebViewWidget(controller: _controller),
              if (_progress < 100 && !_hasError)
                Align(
                  alignment: Alignment.topCenter,
                  child: LinearProgressIndicator(
                    value: _progress == 0 ? null : _progress / 100,
                    minHeight: 2,
                    color: const Color(0xFF7CFF00),
                    backgroundColor: const Color(0xFF172438),
                  ),
                ),
              if (_hasError)
                Center(
                  child: Padding(
                    padding: const EdgeInsets.all(28),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.wifi_off_rounded,
                            size: 48, color: Color(0xFF9AA9BD)),
                        const SizedBox(height: 16),
                        const Text(
                          'Unable to load Marketing2Advertising',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                              fontSize: 19, fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Check your internet connection and try again.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Color(0xFF9AA9BD)),
                        ),
                        const SizedBox(height: 20),
                        FilledButton.icon(
                          onPressed: _reload,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Try again'),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
