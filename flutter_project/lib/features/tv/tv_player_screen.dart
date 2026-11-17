import 'package:chewie/chewie.dart';
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import 'tv_screen.dart';

class M2ATvPlayerScreen extends StatefulWidget {
  const M2ATvPlayerScreen({super.key, required this.channel});

  final TvChannel channel;

  @override
  State<M2ATvPlayerScreen> createState() => _M2ATvPlayerScreenState();
}

class _M2ATvPlayerScreenState extends State<M2ATvPlayerScreen> {
  late final VideoPlayerController _videoController;
  ChewieController? _chewieController;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _videoController = VideoPlayerController.networkUrl(Uri.parse(widget.channel.url));
    _initialize();
  }

  Future<void> _initialize() async {
    try {
      await _videoController.initialize();
      if (!mounted) return;
      _chewieController = ChewieController(
        videoPlayerController: _videoController,
        autoPlay: true,
        looping: false,
        allowFullScreen: true,
        allowMuting: true,
        showControlsOnInitialize: true,
        materialProgressColors: ChewieProgressColors(
          playedColor: const Color(0xFF7CFF00),
          handleColor: const Color(0xFF7CFF00),
          bufferedColor: Colors.white24,
          backgroundColor: Colors.white12,
        ),
      );
      setState(() {});
    } catch (error) {
      if (mounted) setState(() => _error = error);
    }
  }

  @override
  void dispose() {
    _chewieController?.dispose();
    _videoController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.channel.name)),
      body: Center(
        child: _error != null
            ? Padding(
                padding: const EdgeInsets.all(24),
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.signal_wifi_connected_no_internet_4, size: 42, color: Colors.white54),
                  const SizedBox(height: 12),
                  const Text('This stream is currently unavailable.', style: TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 6),
                  const Text('The broadcaster may be offline or may restrict playback in your region.', textAlign: TextAlign.center, style: TextStyle(color: Color(0xFF9AA9BD))),
                  const SizedBox(height: 16),
                  OutlinedButton(onPressed: () => Navigator.pop(context), child: const Text('Back to channels')),
                ]),
              )
            : _chewieController == null
                ? const CircularProgressIndicator()
                : AspectRatio(
                    aspectRatio: _videoController.value.aspectRatio > 0 ? _videoController.value.aspectRatio : 16 / 9,
                    child: Chewie(controller: _chewieController!),
                  ),
      ),
    );
  }
}
