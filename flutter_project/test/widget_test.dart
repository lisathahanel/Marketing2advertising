import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:marketing2advertising_mobile/main.dart';

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
      await tester.ensureVisible(finder);
      await tester.pumpAndSettle();
      expect(finder, findsOneWidget);
    }
  });

  testWidgets('TV destination loads the bundled broadcaster directory', (tester) async {
    await tester.pumpWidget(const Marketing2AdvertisingApp());

    final tvCard = find.text('TV');
    await tester.ensureVisible(tvCard);
    await tester.pumpAndSettle();
    await tester.tap(tvCard);
    await tester.pumpAndSettle();

    expect(find.text('M2A TV'), findsOneWidget);
    expect(find.text('Citizen TV'), findsOneWidget);
    expect(find.text('France 24'), findsOneWidget);
  });
}
