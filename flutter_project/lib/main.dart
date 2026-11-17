// Flutter 3.50 currently deprecates the Material umbrella import; retain it for
// compatibility with the stable Material widgets used throughout this app.
// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const Marketing2AdvertisingApp());
}

class M2AColors {
  static const background = Color(0xFF080D16);
  static const surface = Color(0xFF111B2A);
  static const surfaceRaised = Color(0xFF172438);
  static const accent = Color(0xFF7CFF00);
  static const muted = Color(0xFF9AA9BD);
}

class Marketing2AdvertisingApp extends StatelessWidget {
  const Marketing2AdvertisingApp({super.key});

  @override
  Widget build(BuildContext context) {
    final scheme = ColorScheme.fromSeed(
      seedColor: M2AColors.accent,
      brightness: Brightness.dark,
      surface: M2AColors.surface,
    );
    return MaterialApp(
      title: 'Marketing2Advertising',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: M2AColors.background,
        colorScheme: scheme.copyWith(
          primary: M2AColors.accent,
          secondary: const Color(0xFF55B8FF),
          surface: M2AColors.surface,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: M2AColors.background,
          foregroundColor: Colors.white,
          elevation: 0,
          centerTitle: false,
        ),
        navigationBarTheme: NavigationBarThemeData(
          backgroundColor: M2AColors.surface,
          indicatorColor: M2AColors.accent.withValues(alpha: .16),
          labelTextStyle: WidgetStateProperty.resolveWith((states) =>
            TextStyle(fontSize: 11, color: states.contains(WidgetState.selected)
              ? M2AColors.accent : M2AColors.muted)),
        ),
        cardTheme: CardThemeData(
          color: M2AColors.surface,
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        ),
      ),
      home: const M2ARoot(),
    );
  }
}

class M2ASection {
  const M2ASection(this.title, this.subtitle, this.icon, this.url);
  final String title;
  final String subtitle;
  final IconData icon;
  final String url;
}

const sections = <M2ASection>[
  M2ASection('Blogs', 'Education, business, technology and career articles', Icons.article_outlined, 'https://www.marketing2advertising.com/'),
  M2ASection('Firimu', 'Explore the M2A movie catalogue', Icons.movie_outlined, 'https://marketing2advertising.com/firimu/'),
  M2ASection('Series', 'Discover series and episodic entertainment', Icons.live_tv_outlined, 'https://marketing2advertising.com/'),
  M2ASection('TV', 'Live television and channel directory', Icons.tv_outlined, 'https://marketing2advertising.com/'),
  M2ASection('Games', 'Play and discover casual games', Icons.sports_esports_outlined, 'https://marketing2advertising.com/'),
  M2ASection('Jobs', 'Career guidance and opportunities', Icons.work_outline, 'https://www.marketing2advertising.com/'),
  M2ASection('M2A Services', 'Digital services, advertising and business tools', Icons.grid_view_rounded, 'https://www.marketing2advertising.com/'),
  M2ASection('My M2A', 'Your saved content and app preferences', Icons.person_outline, ''),
];

class M2ARoot extends StatefulWidget {
  const M2ARoot({super.key});

  @override
  State<M2ARoot> createState() => _M2ARootState();
}

class _M2ARootState extends State<M2ARoot> {
  int _index = 0;

  static const _pages = <Widget>[
    M2AHomeScreen(),
    M2ADiscoverScreen(),
    M2AWatchScreen(),
    M2AServicesScreen(),
    M2AMoreScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _index, children: _pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.explore_outlined), selectedIcon: Icon(Icons.explore), label: 'Discover'),
          NavigationDestination(icon: Icon(Icons.play_circle_outline), selectedIcon: Icon(Icons.play_circle), label: 'Watch'),
          NavigationDestination(icon: Icon(Icons.apps_outlined), selectedIcon: Icon(Icons.apps), label: 'Services'),
          NavigationDestination(icon: Icon(Icons.menu), label: 'More'),
        ],
      ),
    );
  }
}

class M2AHomeScreen extends StatelessWidget {
  const M2AHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
              child: Row(children: [
                Container(
                  width: 46, height: 46,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    gradient: const LinearGradient(colors: [M2AColors.accent, Color(0xFF55B8FF)]),
                  ),
                  child: const Center(child: Text('M2A', style: TextStyle(color: Color(0xFF08111B), fontWeight: FontWeight.w900))),
                ),
                const SizedBox(width: 12),
                const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Marketing2Advertising', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                  Text('Transforming learning into earning', style: TextStyle(color: M2AColors.muted, fontSize: 11)),
                ])),
                IconButton(onPressed: () => _open(context, 'https://www.marketing2advertising.com/'), icon: const Icon(Icons.open_in_new, color: M2AColors.accent), tooltip: 'Visit M2A website'),
              ]),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
              child: Container(
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(24),
                  gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF1C3850), Color(0xFF142235), Color(0xFF17203A)]),
                  border: Border.all(color: Colors.white.withValues(alpha: .08)),
                ),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('YOUR WORLD. ONE APP.', style: TextStyle(color: M2AColors.accent, fontSize: 11, letterSpacing: 1.5, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 10),
                  const Text('Learn. Discover.\nGet entertained.', style: TextStyle(fontSize: 29, height: 1.12, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 10),
                  const Text('Explore articles, movies, series, games, career resources and digital services from M2A.', style: TextStyle(color: Color(0xFFD0D9E6), height: 1.45)),
                  const SizedBox(height: 18),
                  FilledButton.icon(
                    onPressed: () => _open(context, 'https://www.marketing2advertising.com/'),
                    icon: const Icon(Icons.explore),
                    label: const Text('Explore M2A'),
                    style: FilledButton.styleFrom(backgroundColor: M2AColors.accent, foregroundColor: const Color(0xFF08111B)),
                  ),
                ]),
              ),
            ),
          ),
          const SliverToBoxAdapter(child: Padding(padding: EdgeInsets.fromLTRB(20, 4, 20, 12), child: _SectionHeading(title: 'Explore M2A', subtitle: 'Everything in one place'))),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
            sliver: SliverGrid(
              delegate: SliverChildBuilderDelegate(
                (context, index) => _SectionCard(section: sections[index]),
                childCount: sections.length,
              ),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 1.22),
            ),
          ),
        ],
      ),
    );
  }
}

class M2ADiscoverScreen extends StatelessWidget {
  const M2ADiscoverScreen({super.key});
  @override
  Widget build(BuildContext context) => const _SectionListPage(title: 'Discover', subtitle: 'Ideas, learning and opportunities', items: [0, 5, 6]);
}

class M2AWatchScreen extends StatelessWidget {
  const M2AWatchScreen({super.key});
  @override
  Widget build(BuildContext context) => const _SectionListPage(title: 'Watch & Play', subtitle: 'Entertainment from across M2A', items: [1, 2, 3, 4]);
}

class M2AServicesScreen extends StatelessWidget {
  const M2AServicesScreen({super.key});
  @override
  Widget build(BuildContext context) => const _SectionListPage(title: 'M2A Services', subtitle: 'Tools and digital solutions', items: [6, 5]);
}

class M2AMoreScreen extends StatelessWidget {
  const M2AMoreScreen({super.key});
  @override
  Widget build(BuildContext context) => SafeArea(child: ListView(padding: const EdgeInsets.all(20), children: [
    const Text('More from M2A', style: TextStyle(fontSize: 25, fontWeight: FontWeight.w800)),
    const SizedBox(height: 6),
    const Text('Your M2A app shortcuts and information', style: TextStyle(color: M2AColors.muted)),
    const SizedBox(height: 20),
    ...[
      ('About Marketing2Advertising', Icons.info_outline, 'https://www.marketing2advertising.com/p/about-us.html'),
      ('Contact', Icons.mail_outline, 'https://www.marketing2advertising.com/p/contact-us.html'),
      ('Privacy Policy', Icons.privacy_tip_outlined, 'https://www.marketing2advertising.com/p/privacy-policy.html'),
      ('Visit M2A Website', Icons.language, 'https://www.marketing2advertising.com/'),
    ].map((item) => Card(child: ListTile(leading: Icon(item.$2, color: M2AColors.accent), title: Text(item.$1), trailing: const Icon(Icons.open_in_new, size: 18), onTap: () => _open(context, item.$3)))),
    const SizedBox(height: 18),
    const Center(child: Text('Marketing2Advertising · Learn • Discover • Grow', textAlign: TextAlign.center, style: TextStyle(color: M2AColors.muted, fontSize: 12))),
  ]));
}

class _SectionListPage extends StatelessWidget {
  const _SectionListPage({required this.title, required this.subtitle, required this.items});
  final String title;
  final String subtitle;
  final List<int> items;
  @override
  Widget build(BuildContext context) => SafeArea(child: ListView(padding: const EdgeInsets.all(20), children: [
    Text(title, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800)),
    const SizedBox(height: 6),
    Text(subtitle, style: const TextStyle(color: M2AColors.muted)),
    const SizedBox(height: 20),
    ...items.map((index) => Padding(padding: const EdgeInsets.only(bottom: 12), child: _SectionCard(section: sections[index], horizontal: true))),
  ]));
}

class _SectionHeading extends StatelessWidget {
  const _SectionHeading({required this.title, required this.subtitle});
  final String title;
  final String subtitle;
  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text(title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
    const SizedBox(height: 3),
    Text(subtitle, style: const TextStyle(color: M2AColors.muted, fontSize: 12)),
  ]);
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.section, this.horizontal = false});
  final M2ASection section;
  final bool horizontal;
  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => section.url.isEmpty
          ? ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Personal library features are coming in a later update.')))
          : _open(context, section.url),
        child: Padding(
          padding: const EdgeInsets.all(15),
          child: horizontal
            ? Row(children: [_icon(), const SizedBox(width: 14), Expanded(child: _labels()), const Icon(Icons.arrow_forward_ios, size: 14, color: M2AColors.muted)])
            : Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [_icon(), _labels()]),
        ),
      ),
    );
  }
  Widget _icon() => Container(width: 42, height: 42, decoration: BoxDecoration(color: M2AColors.accent.withValues(alpha: .12), borderRadius: BorderRadius.circular(13)), child: Icon(section.icon, color: M2AColors.accent));
  Widget _labels() => Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
    Text(section.title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
    const SizedBox(height: 4),
    Text(section.subtitle, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: M2AColors.muted, fontSize: 11, height: 1.3)),
  ]);
}

Future<void> _open(BuildContext context, String value) async {
  final uri = Uri.tryParse(value);
  if (uri == null || !uri.hasScheme) return;
  final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
  if (!opened && context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('This page could not be opened right now.')));
  }
}
