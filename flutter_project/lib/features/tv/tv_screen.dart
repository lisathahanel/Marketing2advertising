import 'dart:convert';

// Flutter 3.50 deprecates the Material umbrella import; keep it for compatibility.
// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'tv_player_screen.dart';
import '../library/saved_items_store.dart';

class TvChannel {
  const TvChannel({required this.id, required this.name, required this.url, required this.category});

  final String id;
  final String name;
  final String url;
  final String category;

  factory TvChannel.fromJson(Map<String, dynamic> json) => TvChannel(
        id: json['id']?.toString() ?? '',
        name: json['name']?.toString() ?? 'Unknown channel',
        url: json['url']?.toString() ?? '',
        category: json['category']?.toString() ?? 'Other',
      );
}

class M2ATvScreen extends StatefulWidget {
  const M2ATvScreen({super.key});

  @override
  State<M2ATvScreen> createState() => _M2ATvScreenState();
}

class _M2ATvScreenState extends State<M2ATvScreen> {
  late Future<List<TvChannel>> _channelsFuture;
  String _query = '';
  String _category = 'All';

  @override
  void initState() {
    super.initState();
    _channelsFuture = _loadChannels();
  }

  Future<List<TvChannel>> _loadChannels() async {
    final raw = await rootBundle.loadString('assets/channels.json');
    final decoded = jsonDecode(raw) as List<dynamic>;
    return decoded
        .whereType<Map<String, dynamic>>()
        .map(TvChannel.fromJson)
        .where((channel) => channel.name.isNotEmpty && channel.url.startsWith('https://'))
        .toList(growable: false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('M2A TV')),
      body: FutureBuilder<List<TvChannel>>(
        future: _channelsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return _MessageState(
              message: 'TV channels could not be loaded.',
              onRetry: () => setState(() => _channelsFuture = _loadChannels()),
            );
          }
          final channels = snapshot.data ?? const <TvChannel>[];
          final categories = <String>{'All', ...channels.map((channel) => channel.category)}.toList();
          final filtered = channels.where((channel) {
            final matchesCategory = _category == 'All' || channel.category == _category;
            final q = _query.trim().toLowerCase();
            final matchesQuery = q.isEmpty || channel.name.toLowerCase().contains(q);
            return matchesCategory && matchesQuery;
          }).toList();
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                child: TextField(
                  onChanged: (value) => setState(() => _query = value),
                  decoration: InputDecoration(
                    hintText: 'Search channels',
                    prefixIcon: const Icon(Icons.search),
                    filled: true,
                    fillColor: const Color(0xFF111B2A),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                  ),
                ),
              ),
              SizedBox(
                height: 48,
                child: ListView.separated(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  scrollDirection: Axis.horizontal,
                  itemCount: categories.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, index) {
                    final category = categories[index];
                    return ChoiceChip(
                      label: Text(category),
                      selected: _category == category,
                      onSelected: (_) => setState(() => _category = category),
                    );
                  },
                ),
              ),
              Expanded(
                child: filtered.isEmpty
                    ? const Center(child: Text('No channels match your search.'))
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: filtered.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, index) {
                          final channel = filtered[index];
                          return Card(
                            child: ListTile(
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                              leading: Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  color: const Color(0xFF7CFF00).withValues(alpha: .12),
                                  borderRadius: BorderRadius.circular(13),
                                ),
                                child: const Icon(Icons.live_tv, color: Color(0xFF7CFF00)),
                              ),
                              title: Text(channel.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                              subtitle: Text(channel.category),
                              trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                                FutureBuilder<bool>(
                                  future: SavedItemsStore.contains(channel.id),
                                  builder: (context, saved) => IconButton(
                                    tooltip: saved.data == true ? 'Saved to My M2A' : 'Save channel',
                                    onPressed: () async {
                                      await SavedItemsStore.toggle(title: channel.name, url: channel.url, type: 'TV channel', subtitle: channel.category, id: channel.id);
                                      if (context.mounted) setState(() {});
                                    },
                                    icon: Icon(saved.data == true ? Icons.bookmark : Icons.bookmark_border, color: const Color(0xFF7CFF00)),
                                  ),
                                ),
                                const Icon(Icons.play_circle_fill, color: Color(0xFF7CFF00), size: 30),
                              ]),
                              onTap: () => Navigator.of(context).push(
                                MaterialPageRoute<void>(builder: (_) => M2ATvPlayerScreen(channel: channel)),
                              ),
                            ),
                          );
                        },
                      ),
              ),
              const Padding(
                padding: EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: Text(
                  'Streams are provided by their respective broadcasters. Availability may vary by region.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Color(0xFF9AA9BD), fontSize: 11),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _MessageState extends StatelessWidget {
  const _MessageState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Text(message),
          const SizedBox(height: 12),
          OutlinedButton(onPressed: onRetry, child: const Text('Try again')),
        ]),
      );
}
