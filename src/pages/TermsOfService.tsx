import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { ArrowLeft, Scale, FileCheck, AlertTriangle, Shield, Copyright, RefreshCw, Mail, UserCheck } from 'lucide-react';
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

const TermsOfService: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen font-sans ${isDark ? 'bg-gray-950' : 'bg-slate-50'}`}>
      {/* Hero */}
      <div className={`relative overflow-hidden border-b ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'}`}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className={`absolute -top-32 -right-32 w-80 h-80 rounded-full blur-3xl ${isDark ? 'bg-sky-600/15' : 'bg-sky-200/60'}`} />
          <div className={`absolute -bottom-16 -left-16 w-64 h-64 rounded-full blur-3xl ${isDark ? 'bg-slate-600/10' : 'bg-slate-100/80'}`} />
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
                isDark ? 'bg-sky-500/10 border border-sky-500/20' : 'bg-sky-50 border border-sky-100'
              }`}
            >
              <Scale className="w-9 h-9 text-sky-500" />
            </div>
            <div>
              <p className={`text-xs font-semibold tracking-[0.15em] uppercase mb-1 ${isDark ? 'text-sky-400' : 'text-sky-500'}`}>
                Legal
              </p>
              <h1 className={`text-3xl md:text-4xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Terms of Service
              </h1>
            </div>
          </div>

          <p className={`mt-5 text-base leading-relaxed max-w-2xl ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            By accessing and using Universal File Converter, you agree to be bound by these terms. Please read them carefully before using our service.
          </p>

          <div className="mt-5 flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${
                isDark ? 'bg-sky-900/30 text-sky-400 border border-sky-800/40' : 'bg-sky-50 text-sky-600 border border-sky-100'
              }`}
            >
              Free to Use
            </span>
            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>Last updated: June 2026</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-10 max-w-4xl">
        <div className="grid gap-3">
          <Section icon={FileCheck} iconColor="text-emerald-500" iconBg={isDark ? 'bg-emerald-900/30 border border-emerald-800/30' : 'bg-emerald-50 border border-emerald-100'} title="Acceptance of Terms" isDark={isDark}>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
              By accessing and using Universal File Converter, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these terms, please do not use the service.
            </p>
          </Section>

          <Section icon={UserCheck} iconColor="text-blue-500" iconBg={isDark ? 'bg-blue-900/30 border border-blue-800/30' : 'bg-blue-50 border border-blue-100'} title="Use License" isDark={isDark}>
            <p className={`text-sm leading-relaxed mb-3 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
              Universal File Converter grants you a personal, non-exclusive, non-transferable license to use the service for converting files in accordance with these terms.
            </p>
            <ul className="space-y-1.5">
              {[
                'You may not use the service for any illegal purposes',
                'You may not attempt to decompile or reverse engineer the service',
                'You may not redistribute or sell access to the service',
              ].map((item) => (
                <Bullet key={item} color="bg-blue-500" isDark={isDark}>{item}</Bullet>
              ))}
            </ul>
          </Section>

          <Section icon={AlertTriangle} iconColor="text-amber-500" iconBg={isDark ? 'bg-amber-900/30 border border-amber-800/30' : 'bg-amber-50 border border-amber-100'} title="Service Limitations" isDark={isDark}>
            <p className={`text-sm leading-relaxed mb-3 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
              The service is provided "as is" and "as available" without any warranties of any kind, either express or implied.
            </p>
            <ul className="space-y-1.5">
              {[
                'Maximum file size: 100MB per file',
                'Supported file formats are limited to those listed in the application',
                'Conversion quality may vary depending on the input file and selected options',
              ].map((item) => (
                <Bullet key={item} color="bg-amber-500" isDark={isDark}>{item}</Bullet>
              ))}
            </ul>
          </Section>

          <Section icon={Shield} iconColor="text-violet-500" iconBg={isDark ? 'bg-violet-900/30 border border-violet-800/30' : 'bg-violet-50 border border-violet-100'} title="User Responsibilities" isDark={isDark}>
            <p className={`text-sm leading-relaxed mb-3 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
              You are responsible for:
            </p>
            <ul className="space-y-1.5">
              {[
                'Ensuring you have the right to convert the files you upload',
                'Maintaining the security of your device and browser',
                'Any consequences resulting from the use of converted files',
              ].map((item) => (
                <Bullet key={item} color="bg-violet-500" isDark={isDark}>{item}</Bullet>
              ))}
            </ul>
          </Section>

          <Section icon={Copyright} iconColor="text-rose-500" iconBg={isDark ? 'bg-rose-900/30 border border-rose-800/30' : 'bg-rose-50 border border-rose-100'} title="Intellectual Property" isDark={isDark}>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
              Universal File Converter and its original content, features, and functionality are owned by AMSC and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>
          </Section>

          <Section icon={AlertTriangle} iconColor="text-orange-500" iconBg={isDark ? 'bg-orange-900/30 border border-orange-800/30' : 'bg-orange-50 border border-orange-100'} title="Disclaimer" isDark={isDark}>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
              We do not guarantee that the service will be uninterrupted, timely, secure, or error-free. We are not responsible for any data loss or file corruption that may occur during the conversion process.
            </p>
          </Section>

          <Section icon={RefreshCw} iconColor="text-cyan-500" iconBg={isDark ? 'bg-cyan-900/30 border border-cyan-800/30' : 'bg-cyan-50 border border-cyan-100'} title="Changes to Terms" isDark={isDark}>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
              We reserve the right to modify these terms at any time. We will notify users of any changes by updating the date at the top of this page.
            </p>
          </Section>

          {/* Contact CTA */}
          <div
            className={`rounded-2xl border p-6 ${
              isDark
                ? 'bg-gradient-to-br from-sky-950/60 to-gray-900 border-sky-800/30'
                : 'bg-gradient-to-br from-sky-50 to-white border-sky-100 shadow-sm'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 p-2.5 rounded-xl ${isDark ? 'bg-sky-900/40 border border-sky-800/30' : 'bg-sky-50 border border-sky-100'}`}>
                <Mail className="w-5 h-5 text-sky-500" />
              </div>
              <div>
                <h2 className={`text-base font-semibold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>Contact</h2>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                  For any questions about these Terms of Service, please contact us at{' '}
                  <a
                    href="mailto:terms@universalfileconverter.com"
                    className={`font-medium underline underline-offset-2 ${isDark ? 'text-sky-400 hover:text-sky-300' : 'text-sky-600 hover:text-sky-700'}`}
                  >
                    terms@universalfileconverter.com
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

export default TermsOfService;
