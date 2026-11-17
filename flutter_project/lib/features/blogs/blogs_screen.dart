import 'dart:convert';

// Flutter 3.50 deprecates the Material umbrella import; keep it for compatibility.
// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';

class M2ABlogPost {
  const M2ABlogPost({required this.title, required this.url, required this.published, required this.summary, this.imageUrl});

  final String title;
  final String url;
  final String published;
  final String summary;
  final String? imageUrl;

  factory M2ABlogPost.fromJson(Map<String, dynamic> json) {
    final title = (json['title']?[r'$t'] ?? 'Untitled article').toString();
    final links = (json['link'] as List<dynamic>? ?? const []);
    final alternateLinks = links.whereType<Map<String, dynamic>>().where((link) => link['rel'] == 'alternate').toList();
    final alternate = alternateLinks.isEmpty ? null : alternateLinks.first;
    final published = (json['published']?[r'$t'] ?? '').toString();
    final rawSummary = (json['summary']?[r'$t'] ?? json['content']?[r'$t'] ?? '').toString();
    final image = json[r'media$thumbnail']?['url']?.toString();
    return M2ABlogPost(
      title: title,
      url: (alternate?['href'] ?? 'https://www.marketing2advertising.com/').toString(),
      published: published,
      summary: _plainText(rawSummary),
      imageUrl: image,
    );
  }

  static String _plainText(String html) => html
      .replaceAll(RegExp(r'<br\s*/?>', caseSensitive: false), ' ')
      .replaceAll(RegExp(r'<[^>]*>'), ' ')
      .replaceAll('&nbsp;', ' ')
      .replaceAll('&amp;', '&')
      .replaceAll('&quot;', '"')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();
}

class M2ABlogsScreen extends StatefulWidget {
  const M2ABlogsScreen({super.key});

  @override
  State<M2ABlogsScreen> createState() => _M2ABlogsScreenState();
}

class _M2ABlogsScreenState extends State<M2ABlogsScreen> {
  late Future<List<M2ABlogPost>> _postsFuture;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _postsFuture = _loadPosts();
  }

  Future<List<M2ABlogPost>> _loadPosts() async {
    final uri = Uri.https(
      'www.marketing2advertising.com',
      '/feeds/posts/default',
      {'alt': 'json', 'max-results': '25', 'orderby': 'published'},
    );
    final response = await http.get(uri, headers: const {'Accept': 'application/json'}).timeout(const Duration(seconds: 20));
    if (response.statusCode != 200) {
      throw Exception('Blogger returned HTTP ${response.statusCode}');
    }
    final decoded = jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>;
    final entries = decoded['feed']?['entry'] as List<dynamic>? ?? const [];
    return entries
        .whereType<Map<String, dynamic>>()
        .map(M2ABlogPost.fromJson)
        .where((post) => post.url.startsWith('https://'))
        .toList(growable: false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('M2A Blogs')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              onChanged: (value) => setState(() => _query = value),
              decoration: InputDecoration(
                hintText: 'Search articles',
                prefixIcon: const Icon(Icons.search),
                filled: true,
                fillColor: const Color(0xFF111B2A),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
              ),
            ),
          ),
          Expanded(
            child: FutureBuilder<List<M2ABlogPost>>(
              future: _postsFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return _BlogMessage(
                    message: 'The latest articles could not be loaded right now.',
                    onRetry: () => setState(() => _postsFuture = _loadPosts()),
                  );
                }
                final query = _query.trim().toLowerCase();
                final posts = (snapshot.data ?? const <M2ABlogPost>[]).where((post) {
                  return query.isEmpty || post.title.toLowerCase().contains(query) || post.summary.toLowerCase().contains(query);
                }).toList();
                if (posts.isEmpty) {
                  return const Center(child: Text('No articles match your search.'));
                }
                return RefreshIndicator(
                  onRefresh: () async => setState(() => _postsFuture = _loadPosts()),
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: posts.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final post = posts[index];
                      return Card(
                        clipBehavior: Clip.antiAlias,
                        child: InkWell(
                          onTap: () => _openPost(post.url),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text(post.title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                              if (post.published.isNotEmpty) ...[
                                const SizedBox(height: 5),
                                Text(post.published.split('T').first, style: const TextStyle(color: Color(0xFF9AA9BD), fontSize: 11)),
                              ],
                              if (post.summary.isNotEmpty) ...[
                                const SizedBox(height: 9),
                                Text(post.summary, maxLines: 3, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Color(0xFFD0D9E6), height: 1.4)),
                              ],
                              const SizedBox(height: 10),
                              const Row(mainAxisAlignment: MainAxisAlignment.end, children: [
                                Text('Read article', style: TextStyle(color: Color(0xFF7CFF00), fontWeight: FontWeight.w700, fontSize: 12)),
                                SizedBox(width: 6),
                                Icon(Icons.arrow_forward, size: 15, color: Color(0xFF7CFF00)),
                              ]),
                            ]),
                          ),
                        ),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _openPost(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null || !uri.hasScheme) return;
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}

class _BlogMessage extends StatelessWidget {
  const _BlogMessage({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            OutlinedButton(onPressed: onRetry, child: const Text('Try again')),
            TextButton(
              onPressed: () => launchUrl(Uri.parse('https://www.marketing2advertising.com/'), mode: LaunchMode.externalApplication),
              child: const Text('Open M2A website'),
            ),
          ]),
        ),
      );
}
