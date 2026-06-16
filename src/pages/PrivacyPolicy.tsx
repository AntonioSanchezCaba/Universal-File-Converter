import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { ArrowLeft, Shield, Lock, Cookie, Database, Bell, Mail, Eye, Server } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SectionProps {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  isDark: boolean;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ icon: Icon, iconColor, iconBg, title, isDark, children }) => (
  <div
    className={`group rounded-2xl border p-6 transition-all duration-200 ${
      isDark
        ? 'bg-gray-900 border-gray-800 hover:border-gray-700'
        : 'bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300'
    }`}
  >
    <div className="flex items-start gap-4">
      <div className={`flex-shrink-0 p-2.5 rounded-xl ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className={`text-base font-semibold mb-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>
          {title}
        </h2>
        {children}
      </div>
    </div>
  </div>
);

const Bullet: React.FC<{ color: string; isDark: boolean; children: React.ReactNode }> = ({ color, isDark, children }) => (
  <li className={`flex items-start gap-3 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
    <span className={`mt-[7px] flex-shrink-0 w-1.5 h-1.5 rounded-full ${color}`} />
    <span className="leading-relaxed text-sm">{children}</span>
  </li>
);

const PrivacyPolicy: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen font-sans ${isDark ? 'bg-gray-950' : 'bg-slate-50'}`}>
      {/* Hero */}
      <div className={`relative overflow-hidden border-b ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'}`}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className={`absolute -top-32 -right-32 w-80 h-80 rounded-full blur-3xl ${isDark ? 'bg-blue-600/15' : 'bg-blue-200/60'}`} />
          <div className={`absolute -bottom-16 -left-16 w-64 h-64 rounded-full blur-3xl ${isDark ? 'bg-emerald-600/10' : 'bg-emerald-100/80'}`} />
        </div>
        <div className="relative container mx-auto px-6 py-12 max-w-4xl">
          <Link
            to="/"
            className={`inline-flex items-center gap-2 text-sm font-medium mb-10 px-4 py-2 rounded-full border transition-all duration-200 ${
              isDark
                ? 'border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white bg-gray-800/70 backdrop-blur-sm'
                : 'border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900 bg-white shadow-sm'
            }`}
          >
            <ArrowLeft size={14} />
            Back to Converter
          </Link>

          <div className="flex items-center gap-5">
            <div
              className={`flex-shrink-0 p-4 rounded-2xl ${
                isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-100'
              }`}
            >
              <Shield className="w-9 h-9 text-blue-500" />
            </div>
            <div>
              <p className={`text-xs font-semibold tracking-[0.15em] uppercase mb-1 ${isDark ? 'text-blue-400' : 'text-blue-500'}`}>
                Legal
              </p>
              <h1 className={`text-3xl md:text-4xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Privacy Policy
              </h1>
            </div>
          </div>

          <p className={`mt-5 text-base leading-relaxed max-w-2xl ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            At Universal File Converter, your privacy is our priority. All conversions happen entirely in your browser — we never see, store, or transmit your files.
          </p>

          <div className="mt-5 flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${
                isDark ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/40' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              100% Client-Side
            </span>
            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>Last updated: June 2026</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-10 max-w-4xl">
        <div className="grid gap-3">
          <Section icon={Lock} iconColor="text-emerald-500" iconBg={isDark ? 'bg-emerald-900/30 border border-emerald-800/30' : 'bg-emerald-50 border border-emerald-100'} title="Local Processing" isDark={isDark}>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
              All file conversions are processed entirely in your browser. Your files never leave your device or get uploaded to any servers. This ensures maximum privacy and security of your data.
            </p>
          </Section>

          <Section icon={Database} iconColor="text-blue-500" iconBg={isDark ? 'bg-blue-900/30 border border-blue-800/30' : 'bg-blue-50 border border-blue-100'} title="Data Collection" isDark={isDark}>
            <p className={`text-sm leading-relaxed mb-3 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
              We do not collect or store any of your files or personal information. The application runs entirely client-side.
            </p>
            <p className={`text-sm leading-relaxed mb-3 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
              We may collect anonymous usage statistics to improve our service, including:
            </p>
            <ul className="space-y-1.5">
              {['Browser type and version', 'Operating system', 'Screen resolution', 'Feature usage patterns'].map((item) => (
                <Bullet key={item} color="bg-blue-500" isDark={isDark}>{item}</Bullet>
              ))}
            </ul>
          </Section>

          <Section icon={Eye} iconColor="text-violet-500" iconBg={isDark ? 'bg-violet-900/30 border border-violet-800/30' : 'bg-violet-50 border border-violet-100'} title="Third-Party Services" isDark={isDark}>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
              We do not integrate with any third-party services that could compromise your privacy. All processing is done locally in your browser with zero external network calls for your files.
            </p>
          </Section>

          <Section icon={Cookie} iconColor="text-amber-500" iconBg={isDark ? 'bg-amber-900/30 border border-amber-800/30' : 'bg-amber-50 border border-amber-100'} title="Cookies" isDark={isDark}>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
              We use only essential cookies to remember your preferences (like dark/light mode). No tracking or advertising cookies are used.
            </p>
          </Section>

          <Section icon={Server} iconColor="text-cyan-500" iconBg={isDark ? 'bg-cyan-900/30 border border-cyan-800/30' : 'bg-cyan-50 border border-cyan-100'} title="Data Security" isDark={isDark}>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
              Because your files are processed locally, they are inherently protected by your device's security. We never transmit file data to external servers, eliminating the risk of interception or unauthorized access.
            </p>
          </Section>

          <Section icon={Bell} iconColor="text-rose-500" iconBg={isDark ? 'bg-rose-900/30 border border-rose-800/30' : 'bg-rose-50 border border-rose-100'} title="Updates to Privacy Policy" isDark={isDark}>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
              We may update this privacy policy from time to time. Any changes will be reflected on this page with an updated revision date.
            </p>
          </Section>

          {/* Contact CTA */}
          <div
            className={`rounded-2xl border p-6 ${
              isDark
                ? 'bg-gradient-to-br from-blue-950/60 to-gray-900 border-blue-800/30'
                : 'bg-gradient-to-br from-blue-50 to-white border-blue-100 shadow-sm'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 p-2.5 rounded-xl ${isDark ? 'bg-blue-900/40 border border-blue-800/30' : 'bg-blue-50 border border-blue-100'}`}>
                <Mail className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h2 className={`text-base font-semibold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>Contact Us</h2>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                  Have questions about our privacy policy? Reach out at{' '}
                  <a
                    href="mailto:privacy@universalfileconverter.com"
                    className={`font-medium underline underline-offset-2 ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                  >
                    privacy@universalfileconverter.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
