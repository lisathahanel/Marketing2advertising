// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';


enum M2AHubType { jobs, services }

class _HubColors {
  static const accent = Color(0xFF7CFF00);
  static const muted = Color(0xFF9AA9BD);
}

class M2AHubScreen extends StatelessWidget {
  const M2AHubScreen({super.key, required this.type});

  final M2AHubType type;

  bool get _isJobs => type == M2AHubType.jobs;

  @override
  Widget build(BuildContext context) {
    final items = _isJobs ? _jobItems : _serviceItems;
    final title = _isJobs ? 'Jobs & Careers' : 'M2A Services';
    final subtitle = _isJobs
        ? 'Explore career guidance, opportunities and practical work resources.'
        : 'Digital services that help people, creators and businesses grow.';
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(18, 12, 18, 28),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(22),
              gradient: const LinearGradient(
                colors: [Color(0xFF1C3850), Color(0xFF17203A)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              border: Border.all(color: Colors.white.withValues(alpha: .08)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _isJobs ? 'BUILD YOUR NEXT STEP' : 'MAKE YOUR IDEAS WORK',
                  style: const TextStyle(
                    color: _HubColors.accent,
                    fontSize: 10,
                    letterSpacing: 1.4,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 10),
                Text(title, style: const TextStyle(fontSize: 25, fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                Text(subtitle, style: const TextStyle(color: Color(0xFFD0D9E6), height: 1.5)),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Text(
            _isJobs ? 'Career resources' : 'What we can help with',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 10),
          ...items.map((item) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Card(
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 15, vertical: 8),
                    leading: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: _HubColors.accent.withValues(alpha: .12),
                        borderRadius: BorderRadius.circular(13),
                      ),
                      child: Icon(item.icon, color: _HubColors.accent),
                    ),
                    title: Text(item.title, style: const TextStyle(fontWeight: FontWeight.w700)),
                    subtitle: Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(item.description, style: const TextStyle(color: _HubColors.muted, fontSize: 12, height: 1.35)),
                    ),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: _HubColors.muted),
                    onTap: () => _open(context, item.url),
                  ),
                ),
              )),
          const SizedBox(height: 8),
          FilledButton.icon(
            onPressed: () => _open(context, 'https://www.marketing2advertising.com/p/contact-us.html'),
            icon: const Icon(Icons.mail_outline),
            label: Text(_isJobs ? 'Contact M2A about opportunities' : 'Request a service'),
            style: FilledButton.styleFrom(
              backgroundColor: _HubColors.accent,
              foregroundColor: const Color(0xFF08111B),
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
          const SizedBox(height: 10),
          const Text(
            'Availability, pricing and application details are confirmed on the linked M2A pages. The app does not represent search results as verified live vacancies.',
            textAlign: TextAlign.center,
            style: TextStyle(color: _HubColors.muted, fontSize: 10, height: 1.4),
          ),
        ],
      ),
    );
  }

  static const _jobItems = <_HubItem>[
    _HubItem('Job opportunities', 'Browse M2A articles and updates about work opportunities.', Icons.work_outline, 'https://www.marketing2advertising.com/search?q=jobs'),
    _HubItem('Career guidance', 'Explore CV, interview and career-development resources.', Icons.trending_up, 'https://www.marketing2advertising.com/search?q=career'),
    _HubItem('Online work & skills', 'Find learning resources for digital and remote-work skills.', Icons.laptop_mac, 'https://www.marketing2advertising.com/search?q=online+work'),
    _HubItem('Business & entrepreneurship', 'Read practical guides for starting and growing a business.', Icons.business_center_outlined, 'https://www.marketing2advertising.com/search?q=business'),
  ];

  static const _serviceItems = <_HubItem>[
    _HubItem('Website design & development', 'Build or improve a professional website for your brand.', Icons.web, 'https://www.marketing2advertising.com/p/contact-us.html'),
    _HubItem('Website monetization', 'Get guidance on website growth and monetization options.', Icons.analytics_outlined, 'https://www.marketing2advertising.com/p/contact-us.html'),
    _HubItem('Business, event & profile advertising', 'Promote a business, event, service or professional profile.', Icons.campaign_outlined, 'https://www.marketing2advertising.com/p/contact-us.html'),
    _HubItem('Logo design & branding', 'Create a visual identity for a project or business.', Icons.palette_outlined, 'https://www.marketing2advertising.com/p/contact-us.html'),
    _HubItem('Digital tools & web apps', 'Discuss custom web apps and digital solutions.', Icons.apps_outlined, 'https://www.marketing2advertising.com/p/contact-us.html'),
  ];
}

class _HubItem {
  const _HubItem(this.title, this.description, this.icon, this.url);
  final String title;
  final String description;
  final IconData icon;
  final String url;
}

Future<void> _open(BuildContext context, String value) async {
  final uri = Uri.tryParse(value);
  if (uri == null || !uri.hasScheme) return;
  final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
  if (!opened && context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('This M2A page could not be opened right now.')),
    );
  }
}
