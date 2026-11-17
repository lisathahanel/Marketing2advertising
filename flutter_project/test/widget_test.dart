import 'package:flutter_test/flutter_test.dart';
import 'package:marketing2advertising_mobile/shared/m2a_web_screen.dart';

void main() {
  group('M2A website origin', () {
    test('uses the non-www website as the app content source', () {
      expect(m2aWebsiteUrl, 'https://marketing2advertising.com');
    });

    test('keeps both M2A website hostnames inside the WebView', () {
      expect(
        isM2AWebsiteUri(Uri.parse('https://marketing2advertising.com/firimu/')),
        isTrue,
      );
      expect(
        isM2AWebsiteUri(Uri.parse('https://www.marketing2advertising.com/')),
        isTrue,
      );
    });

    test('does not treat unrelated or insecure hosts as M2A content', () {
      expect(isM2AWebsiteUri(Uri.parse('https://example.com')), isFalse);
      expect(
        isM2AWebsiteUri(Uri.parse('http://marketing2advertising.com')),
        isFalse,
      );
      expect(
        isM2AWebsiteUri(Uri.parse('https://marketing2advertising.com.example.org')),
        isFalse,
      );
    });
  });
}
