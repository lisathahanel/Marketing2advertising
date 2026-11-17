// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import 'saved_items_store.dart';

class MyM2AScreen extends StatefulWidget {
  const MyM2AScreen({super.key});
  @override
  State<MyM2AScreen> createState() => _MyM2AScreenState();
}

class _MyM2AScreenState extends State<MyM2AScreen> {
  late Future<List<Map<String, dynamic>>> _items;
  bool _notifications = true;
  bool _confirmExternalLinks = false;

  @override
  void initState() {
    super.initState();
    _items = SavedItemsStore.all();
    _loadPreferences();
  }

  Future<void> _loadPreferences() async {
    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;
    setState(() {
      _notifications = prefs.getBool('m2a_notifications_enabled') ?? true;
      _confirmExternalLinks = prefs.getBool('m2a_confirm_external_links') ?? false;
    });
  }

  Future<void> _refresh() async => setState(() => _items = SavedItemsStore.all());

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('My M2A')),
    body: ListView(padding: const EdgeInsets.fromLTRB(16, 8, 16, 28), children: [
      Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(20), gradient: const LinearGradient(colors: [Color(0xFF1C3850), Color(0xFF17203A)])),
        child: const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('YOUR PERSONAL SPACE', style: TextStyle(color: Color(0xFF7CFF00), fontSize: 10, letterSpacing: 1.4, fontWeight: FontWeight.w800)),
          SizedBox(height: 8), Text('Saved with M2A', style: TextStyle(fontSize: 23, fontWeight: FontWeight.w800)),
          SizedBox(height: 5), Text('Keep useful articles and TV channels close at hand on this device.', style: TextStyle(color: Color(0xFFD0D9E6), height: 1.4)),
        ]),
      ),
      const SizedBox(height: 22),
      const Text('My saved content', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
      const SizedBox(height: 8),
      FutureBuilder<List<Map<String, dynamic>>>(
        future: _items,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) return const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()));
          final items = snapshot.data ?? [];
          if (items.isEmpty) return const Card(child: Padding(padding: EdgeInsets.all(20), child: Column(children: [Icon(Icons.bookmark_border, size: 34, color: Color(0xFF9AA9BD)), SizedBox(height: 8), Text('Nothing saved yet', style: TextStyle(fontWeight: FontWeight.w700)), SizedBox(height: 4), Text('Use the bookmark icon on an article or TV channel to add it here.', textAlign: TextAlign.center, style: TextStyle(color: Color(0xFF9AA9BD), fontSize: 12))])));
          return Column(children: items.map((item) => Card(child: ListTile(
            leading: Icon(item['type'] == 'TV channel' ? Icons.live_tv : Icons.article_outlined, color: const Color(0xFF7CFF00)),
            title: Text((item['title'] ?? 'Saved item').toString(), maxLines: 2, overflow: TextOverflow.ellipsis),
            subtitle: Text((item['type'] ?? 'Saved').toString()),
            trailing: IconButton(tooltip: 'Remove saved item', icon: const Icon(Icons.delete_outline), onPressed: () async { await SavedItemsStore.remove(item['id'].toString()); await _refresh(); }),
            onTap: () async { final uri = Uri.tryParse((item['url'] ?? '').toString()); if (uri != null && uri.hasScheme) await launchUrl(uri, mode: LaunchMode.externalApplication); },
          ))).toList());
        },
      ),
      const SizedBox(height: 22),
      const Text('App preferences', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
      const SizedBox(height: 8),
      Card(child: SwitchListTile(title: const Text('Notifications'), subtitle: const Text('Preference saved on this device'), value: _notifications, activeThumbColor: const Color(0xFF7CFF00), onChanged: (value) async { final prefs = await SharedPreferences.getInstance(); await prefs.setBool('m2a_notifications_enabled', value); if (mounted) setState(() => _notifications = value); })),
      Card(child: SwitchListTile(title: const Text('Confirm external links'), subtitle: const Text('Ask before opening links outside the app (preference only)'), value: _confirmExternalLinks, activeThumbColor: const Color(0xFF7CFF00), onChanged: (value) async { final prefs = await SharedPreferences.getInstance(); await prefs.setBool('m2a_confirm_external_links', value); if (mounted) setState(() => _confirmExternalLinks = value); })),
      const Padding(padding: EdgeInsets.only(top: 10), child: Text('Saved items and preferences are stored locally on this device. Notifications are a preference switch only; push delivery will be connected in a later update.', style: TextStyle(color: Color(0xFF9AA9BD), fontSize: 11, height: 1.4))),
    ]),
  );
}
