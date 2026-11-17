// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'shared/m2a_web_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const Marketing2AdvertisingApp());
}

class Marketing2AdvertisingApp extends StatelessWidget {
  const Marketing2AdvertisingApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Marketing2Advertising',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF070B12),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF7CFF00),
          brightness: Brightness.dark,
          surface: const Color(0xFF101827),
        ),
      ),
      home: const M2AWebScreen(),
    );
  }
}
