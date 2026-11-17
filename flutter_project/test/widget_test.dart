// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:marketing2advertising_mobile/main.dart';
import 'package:marketing2advertising_mobile/features/hub/m2a_hub_screen.dart';
import 'package:marketing2advertising_mobile/features/tv/tv_screen.dart';

void main() {
  testWidgets('M2A mobile opens on the branded home screen', (tester) async {
    await tester.pumpWidget(const Marketing2AdvertisingApp());

    expect(find.text('Marketing2Advertising'), findsOneWidget);
    expect(find.text('YOUR WORLD. ONE APP.'), findsOneWidget);
    expect(find.text('Home'), findsOneWidget);
    expect(find.text('Discover'), findsOneWidget);
    expect(find.text('Watch'), findsOneWidget);
    expect(find.text('Services'), findsOneWidget);
    expect(find.text('More'), findsOneWidget);
  });

  testWidgets('M2A home includes the primary service destinations', (tester) async {
    await tester.pumpWidget(const Marketing2AdvertisingApp());

    for (final label in ['Blogs', 'Firimu', 'Series', 'TV', 'Games', 'Jobs', 'M2A Services']) {
      final finder = find.text(label);
      expect(finder, findsWidgets);
    }
  });

  testWidgets('Jobs hub displays career resources', (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: M2AHubScreen(type: M2AHubType.jobs),
    ));

    expect(find.text('Jobs & Careers'), findsOneWidget);
    expect(find.text('Career resources'), findsOneWidget);
    expect(find.text('Job opportunities'), findsOneWidget);
  });

  testWidgets('M2A Services hub displays its service list', (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: M2AHubScreen(type: M2AHubType.services),
    ));

    expect(find.text('What we can help with'), findsOneWidget);
    expect(find.text('Website design & development'), findsOneWidget);
  });

  testWidgets('TV screen loads bundled broadcaster directory', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: M2ATvScreen()));
    await tester.pumpAndSettle();

    expect(find.text('M2A TV'), findsOneWidget);
    expect(find.text('Citizen TV'), findsOneWidget);
    expect(find.text('France 24'), findsOneWidget);
  });
}
