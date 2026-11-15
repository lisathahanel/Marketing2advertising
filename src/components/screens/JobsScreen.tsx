import React, { useEffect, useState } from 'react';
import {
  Briefcase,
  Globe2,
  CheckCircle2,
  Send,
  ExternalLink,
  RotateCw,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { StaticPageData } from '../../types';
import { AdMobBanner } from '../AdMobBanner';

export const JobsScreen: React.FC = () => {
  const [pageData, setPageData] = useState<StaticPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [submitted, setSubmitted] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [targetCountry, setTargetCountry] = useState('Ireland');
  const [skillField, setSkillField] = useState('Tech & Software');

  const countries = ['All', 'Ireland', 'Singapore', 'Luxembourg', 'UAE', 'Norway'];

  const loadJobPage = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        '/api/blogger/page?path=/p/job-matching-across-ireland-singapore_2.html'
      );
      if (res.ok) {
        const data = await res.json();
        setPageData(data);
      }
    } catch (err) {
      console.warn('Failed to fetch job matching page:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobPage();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email) return;
    setSubmitted(true);
    setTimeout(() => {
      setFullName('');
      setEmail('');
    }, 1500);
  };

  return (
    <div className="pb-28 max-w-xl mx-auto px-3.5 space-y-4 animate-in fade-in duration-300">
      {/* Top Direct Site Link */}
      <div className="flex justify-end">
        <a
          href="https://www.marketing2advertising.com/p/job-matching-across-ireland-singapore_2.html"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-xs font-bold transition active:scale-95"
        >
          <span>Open on marketing2advertising.com</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-b from-[#1c1c2b] to-[#12121a] border border-blue-500/30 p-5 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-black uppercase tracking-wider border border-blue-500/30 flex items-center gap-1">
            <Globe2 className="w-3 h-3 text-blue-400" />
            Global Careers & Relocation
          </span>
          <span className="text-[10px] text-amber-400 font-bold">Visa Sponsorships</span>
        </div>

        <h1 className="text-lg sm:text-xl font-black text-white leading-snug">
          Job Matching Across Ireland, Singapore, Luxembourg, UAE & Norway
        </h1>

        <p className="text-xs text-slate-300 mt-2 leading-relaxed">
          M2A connects professionals and talent with verified global opportunities, visa sponsorships, and remote career paths.
        </p>

        {/* Country Chips */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {countries.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCountry(c)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                selectedCountry === c
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white/5 text-slate-300 hover:text-white'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Application Form */}
      <div className="rounded-2xl bg-[#14141e] border border-white/10 p-4 sm:p-5 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-black text-white">Direct Job Matching Inquiry</h3>
        </div>

        {submitted ? (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h4 className="text-xs font-bold text-white">Application Received!</h4>
            <p className="text-[11px] text-slate-300">
              Our career matching specialists will review your profile and reach out via email.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. David Okello"
                className="w-full h-10 px-3 rounded-xl bg-black border border-white/10 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="w-full h-10 px-3 rounded-xl bg-black border border-white/10 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Preferred Country
                </label>
                <select
                  value={targetCountry}
                  onChange={(e) => setTargetCountry(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-black border border-white/10 text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="Ireland">Ireland (Work Permit & Accommodation)</option>
                  <option value="Singapore">Singapore (Employment Pass)</option>
                  <option value="Luxembourg">Luxembourg (EU Blue Card)</option>
                  <option value="UAE">UAE (Dubai Employment Visa)</option>
                  <option value="Norway">Norway (Jobseeker & Tech Visa)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Skill Domain / Profession
              </label>
              <select
                value={skillField}
                onChange={(e) => setSkillField(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-black border border-white/10 text-white focus:outline-none focus:border-amber-400"
              >
                <option value="Tech & Software">Tech, Web & Software Development</option>
                <option value="Caregiver & Nursing">Caregiver, Health & Nursing</option>
                <option value="Marketing & Digital">Digital Marketing & Advertising</option>
                <option value="Hospitality & Logistics">Hospitality & Logistics</option>
                <option value="Engineering">Engineering & Construction</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-amber-500 hover:from-blue-500 hover:to-amber-400 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit for Free Matching</span>
            </button>
          </form>
        )}
      </div>

      {/* AdMob Banner Slot */}
      <AdMobBanner format="banner" />

      {/* Official Content from Blogger Page */}
      <div className="rounded-3xl bg-[#14141e] border border-white/10 p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <h2 className="text-sm font-black text-white flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-amber-400" />
            Official Opportunity Guide
          </h2>
          <button
            onClick={loadJobPage}
            className="p-1 rounded text-slate-400 hover:text-white"
            title="Reload content"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-3 py-6 animate-pulse">
            <div className="w-full h-4 bg-white/10 rounded" />
            <div className="w-3/4 h-3 bg-white/5 rounded" />
            <div className="w-5/6 h-3 bg-white/5 rounded" />
          </div>
        ) : pageData?.contentHtml ? (
          <div
            className="article-content text-xs text-slate-300 leading-relaxed space-y-3 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-white [&_h3]:text-xs [&_h3]:font-bold [&_h3]:text-amber-400 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-blue-400 [&_table]:w-full"
            dangerouslySetInnerHTML={{ __html: pageData.contentHtml }}
          />
        ) : (
          <div className="text-xs text-slate-400 py-4 text-center">
            View details on marketing2advertising.com
          </div>
        )}

        <div className="pt-4 border-t border-white/10 text-center">
          <a
            href="https://www.marketing2advertising.com/p/job-matching-across-ireland-singapore_2.html"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-bold"
          >
            <span>Open Original Page on marketing2advertising.com</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
