import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:video_player/video_player.dart';
import 'package:chewie/chewie.dart';
import 'package:wakelock_plus/wakelock_plus.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await MobileAds.instance.initialize();
  runApp(const ProviderScope(child: M2AApp()));
}

class M2AApp extends StatelessWidget {
  const M2AApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'M2A',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0B0B0F),
        primaryColor: const Color(0xFFF59E0B),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFF59E0B),
          secondary: Color(0xFFE11D48),
          surface: Color(0xFF14141E),
        ),
      ),
      home: const MainNavigationScreen(),
    );
  }
}

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    HomeScreen(),
    TVScreen(),
    FirimuScreen(),
    BlogsScreen(),
    AppsScreen(),
    GamesScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        backgroundColor: const Color(0xFF0B0B0F),
        selectedItemColor: const Color(0xFFF59E0B),
        unselectedItemColor: Colors.grey,
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.tv), label: 'TV'),
          BottomNavigationBarItem(icon: Icon(Icons.movie), label: 'Firimu'),
          BottomNavigationBarItem(icon: Icon(Icons.article), label: 'Blogs'),
          BottomNavigationBarItem(icon: Icon(Icons.apps), label: 'Apps'),
          BottomNavigationBarItem(icon: Icon(Icons.sports_esports), label: 'Games'),
        ],
      ),
    );
  }
}

// Live TV Player Screen
class TVScreen extends StatefulWidget {
  const TVScreen({super.key});

  @override
  State<TVScreen> createState() => _TVScreenState();
}

class _TVScreenState extends State<TVScreen> {
  VideoPlayerController? _videoPlayerController;
  ChewieController? _chewieController;
  bool _isLoading = true;
  bool _isError = false;

  final String streamUrl =
      'https://live-onesignal.royalmedia.co.ke/live/jgB35emfPsiW5aFjKJjbjg.m3u8';

  @override
  void initState() {
    super.initState();
    WakelockPlus.enable();
    _initPlayer(streamUrl);
  }

  Future<void> _initPlayer(String url) async {
    setState(() {
      _isLoading = true;
      _isError = false;
    });

    try {
      _videoPlayerController = VideoPlayerController.networkUrl(Uri.parse(url));
      await _videoPlayerController!.initialize();
      _chewieController = ChewieController(
        videoPlayerController: _videoPlayerController!,
        autoPlay: true,
        isLive: true,
        aspectRatio: 16 / 9,
      );
      setState(() => _isLoading = false);
    } catch (e) {
      setState(() {
        _isLoading = false;
        _isError = true;
      });
    }
  }

  @override
  void dispose() {
    WakelockPlus.disable();
    _videoPlayerController?.dispose();
    _chewieController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('M2A Live Channels'),
        backgroundColor: const Color(0xFF0B0B0F),
      ),
      body: Column(
        children: [
          AspectRatio(
            aspectRatio: 16 / 9,
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(color: Color(0xFFF59E0B)))
                : _isError
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Text(
                              'Network not well – Try Again',
                              style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 12),
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFFF59E0B),
                                foregroundColor: Colors.black,
                              ),
                              onPressed: () => _initPlayer(streamUrl),
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      )
                    : Chewie(controller: _chewieController!),
          ),
          const Expanded(
            child: Center(
              child: Text(
                '19 Live Channels configured in assets/channels.json',
                style: TextStyle(color: Colors.grey),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('M2A Hub'),
        backgroundColor: const Color(0xFF0B0B0F),
      ),
      body: const Center(
        child: Text('Blogger Feed synchronized from marketing2advertising.com'),
      ),
    );
  }
}

class FirimuScreen extends StatelessWidget {
  const FirimuScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Firimu (naka.marketing2advertising.com)'),
        backgroundColor: const Color(0xFF0B0B0F),
      ),
      body: const Center(
        child: Text(
          'Scans and streams 144+ Luganda translated movies directly from naka.marketing2advertising.com',
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}

class BlogsScreen extends StatelessWidget {
  const BlogsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('M2A Blogs (marketing2advertising.com)'),
        backgroundColor: const Color(0xFF0B0B0F),
      ),
      body: const Center(
        child: Text(
          'AI Tools, Freelancing, Software & Career Articles from main site',
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}

class AppsScreen extends StatelessWidget {
  const AppsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Multi Apps (19 Free Tools)'),
        backgroundColor: const Color(0xFF0B0B0F),
      ),
      body: const Center(
        child: Text('19 Free Tools: Calculator, QR, PDF, Video Player, etc.'),
      ),
    );
  }
}

class GamesScreen extends StatelessWidget {
  const GamesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Free Games (15 Games)'),
        backgroundColor: const Color(0xFF0B0B0F),
      ),
      body: const Center(
        child: Text('15 HTML5 Canvas & Native Games'),
      ),
    );
  }
}
