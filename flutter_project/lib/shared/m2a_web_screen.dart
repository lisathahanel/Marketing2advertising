// Flutter 3.50 deprecates the Material umbrella import; keep it for compatibility.
// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

class M2AWebScreen extends StatefulWidget {
  const M2AWebScreen({super.key, required this.title, required this.url});

  final String title;
  final String url;

  @override
  State<M2AWebScreen> createState() => _M2AWebScreenState();
}

class _M2AWebScreenState extends State<M2AWebScreen> {
  late final WebViewController _controller;
  int _progress = 0;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (progress) {
            if (mounted) {
              setState(() => _progress = progress);
            }
          },
          onPageStarted: (_) {
            if (mounted) setState(() {
              _hasError = false;
              _progress = 0;
            });
          },
          onPageFinished: (_) {
            if (mounted) setState(() => _progress = 100);
          },
          onWebResourceError: (error) {
            if (error.isForMainFrame == true && mounted) setState(() => _hasError = true);
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.url));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: Column(
        children: [
          if (_progress < 100 && !_hasError)
            LinearProgressIndicator(
              value: _progress == 0 ? null : _progress / 100,
              minHeight: 2,
              color: const Color(0xFF7CFF00),
              backgroundColor: const Color(0xFF172438),
            ),
          Expanded(
            child: _hasError
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        const Icon(Icons.wifi_off, size: 40, color: Colors.white54),
                        const SizedBox(height: 12),
                        const Text('This M2A page could not be loaded.'),
                        const SizedBox(height: 12),
                        FilledButton(
                          onPressed: () {
                            setState(() {
                              _hasError = false;
                              _progress = 0;
                            });
                            _controller.reload();
                          },
                          child: const Text('Reload page'),
                        ),
                      ]),
                    ),
                  )
                : WebViewWidget(controller: _controller),
          ),
        ],
      ),
    );
  }
}
