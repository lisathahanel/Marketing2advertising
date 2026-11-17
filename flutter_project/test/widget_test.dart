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

  testWidgets('M2A home shows all primary service destinations', (tester) async {
    await tester.pumpWidget(const Marketing2AdvertisingApp());

    expect(find.text('Blogs'), findsOneWidget);
    expect(find.text('Firimu'), findsOneWidget);
    expect(find.text('Series'), findsOneWidget);
    expect(find.text('TV'), findsOneWidget);
    expect(find.text('Games'), findsOneWidget);
    expect(find.text('Jobs'), findsOneWidget);
    expect(find.text('M2A Services'), findsOneWidget);
  });
}
