import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class SavedItemsStore {
  static const _key = 'm2a_saved_items_v1';

  static Future<List<Map<String, dynamic>>> all() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null || raw.isEmpty) return [];
    try {
      final decoded = jsonDecode(raw) as List<dynamic>;
      return decoded.whereType<Map<String, dynamic>>().toList();
    } catch (_) {
      return [];
    }
  }

  static Future<bool> contains(String id) async {
    final items = await all();
    return items.any((item) => item['id'] == id);
  }

  static Future<void> toggle({required String title, required String url, required String type, String subtitle = '', String? id}) async {
    final prefs = await SharedPreferences.getInstance();
    final items = await all();
    final key = id ?? url;
    if (items.any((item) => item['id'] == key)) {
      items.removeWhere((item) => item['id'] == key);
    } else {
      items.insert(0, {'id': key, 'title': title, 'url': url, 'type': type, 'subtitle': subtitle, 'savedAt': DateTime.now().toIso8601String()});
    }
    await prefs.setString(_key, jsonEncode(items));
  }

  static Future<void> remove(String id) async {
    final prefs = await SharedPreferences.getInstance();
    final items = await all();
    items.removeWhere((item) => item['id'] == id);
    await prefs.setString(_key, jsonEncode(items));
  }
}
