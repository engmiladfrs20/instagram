import React, { useMemo } from 'react';
import {
  Activity,
  ArrowUpLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FlaskConical,
  Gauge,
  MessageCircle,
  MessageSquareText,
  Rocket,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
  XCircle,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AnalyticsOverview, WebhookEvent } from '../types';

interface DashboardViewProps {
  analytics: AnalyticsOverview;
  recentWebhooks: WebhookEvent[];
  onNavigate: (tab: string) => void;
}

const numberFormatter = new Intl.NumberFormat('fa-IR');
const percentFormatter = new Intl.NumberFormat('fa-IR', {
  maximumFractionDigits: 1,
});

const formatNumber = (value: number) => numberFormatter.format(Math.max(0, value || 0));
const formatPercent = (value: number) => `${percentFormatter.format(Math.max(0, value || 0))}%`;

const eventLabel = (eventType: string) => {
  if (eventType === 'comments') return 'کامنت جدید';
  if (eventType === 'messages') return 'پیام دایرکت';
  return eventType || 'رویداد وب‌هوک';
};

const eventText = (event: WebhookEvent) => {
  const value = event.payload?.entry?.[0]?.changes?.[0]?.value;
  return value?.text || value?.message?.text || 'رویداد از API رسمی Meta دریافت شد';
};

const eventStatus = (status: WebhookEvent['status']) => {
  if (status === 'processed') return { label: 'پردازش شد', tone: 'success' };
  if (status === 'failed') return { label: 'ناموفق', tone: 'danger' };
  if (status === 'deduped') return { label: 'تکراری', tone: 'warning' };
  return { label: 'دریافت شد', tone: 'info' };
};

const shortDate = (date: string) => {
  const parsedDate = new Date(date);
  return Number.isNaN(parsedDate.getTime())
    ? date
    : parsedDate.toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' });
};

const chartTooltipStyle = {
  background: 'var(--dashboard-popover-bg)',
  border: '1px solid var(--bs-border-color)',
  borderRadius: '14px',
  color: 'var(--bs-body-color)',
  boxShadow: '0 16px 40px rgba(2, 6, 23, 0.22)',
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  analytics,
  recentWebhooks,
  onNavigate,
}) => {
  const performanceData = useMemo(
    () =>
      analytics.dailyStats.map((stat) => ({
        date: shortDate(stat.date),
        inbound: stat.inbound,
        replies: stat.privateReplies + stat.publicReplies,
        leads: stat.leads,
      })),
    [analytics.dailyStats],
  );

  const deliveryData = useMemo(
    () =>
      performanceData.map((stat) => ({
        date: stat.date,
        دریافت: stat.inbound,
        پردازش: Math.max(0, stat.inbound - Math.round(stat.inbound * (analytics.policyBlockRate / 100))),
        پاسخ: stat.replies,
      })),
    [analytics.policyBlockRate, performanceData],
  );

  const distributionData = useMemo(
    () => [
      { name: 'کامنت‌ها', value: analytics.totalCommentsReceived, color: 'var(--color-purple-500)' },
      { name: 'پاسخ خصوصی', value: analytics.privateRepliesSent, color: 'var(--color-indigo-500)' },
      { name: 'سرنخ‌ها', value: analytics.leadsCaptured, color: 'var(--color-emerald-500)' },
    ].filter((item) => item.value > 0),
    [analytics.leadsCaptured, analytics.privateRepliesSent, analytics.totalCommentsReceived],
  );

  const healthTone = analytics.webhookDeliveryRate >= 95 ? 'success' : analytics.webhookDeliveryRate >= 80 ? 'warning' : 'danger';
  const recentEvents = recentWebhooks.slice(0, 5);

  return (
    <main className="dashboard-shell container-fluid px-0">
      <section className="dashboard-hero card border-0 overflow-hidden mb-4">
        <div className="dashboard-hero-glow dashboard-hero-glow-one" />
        <div className="dashboard-hero-glow dashboard-hero-glow-two" />
        <div className="card-body p-4 p-xl-5 position-relative">
          <div className="d-flex flex-column flex-xl-row align-items-xl-center justify-content-between gap-4">
            <div>
              <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                <span className={`badge rounded-pill text-bg-${healthTone} dashboard-status-badge`}>
                  <span className="dashboard-live-dot" />
                  سیستم فعال
                </span>
                <span className="dashboard-kicker">مرکز کنترل Instaflow</span>
              </div>
              <h1 className="display-6 fw-bold mb-2">داشبورد هوشمند اتوماسیون اینستاگرام</h1>
              <p className="dashboard-hero-copy mb-0">
                عملکرد پیام‌ها، کامنت‌ها، پاسخ‌های خودکار و سرنخ‌های فروش را در یک نمای زنده دنبال کنید.
              </p>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <button className="btn btn-outline-warning dashboard-action-btn" onClick={() => onNavigate('webhook_studio')}>
                <FlaskConical size={17} />
                تست وب‌هوک
              </button>
              <button className="btn btn-primary dashboard-action-btn" onClick={() => onNavigate('automations')}>
                <Workflow size={17} />
                ساخت اتوماسیون
                <ArrowUpLeft size={15} />
              </button>
            </div>
          </div>

          <div className="row g-3 mt-4">
            <div className="col-12 col-md-4">
              <div className="hero-stat">
                <span>نرخ تحویل وب‌هوک</span>
                <strong>{formatPercent(analytics.webhookDeliveryRate)}</strong>
                <small>پایداری دریافت رویدادها</small>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="hero-stat">
                <span>اتوماسیون‌های فعال</span>
                <strong>{formatNumber(analytics.activeAutomations)}</strong>
                <small>از {formatNumber(analytics.totalAutomations)} اتوماسیون</small>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="hero-stat">
                <span>نرخ تبدیل سرنخ</span>
                <strong>{formatPercent(analytics.conversionRate)}</strong>
                <small>بر اساس داده‌های ثبت‌شده</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="row g-3 g-xl-4 mb-4" aria-label="شاخص‌های کلیدی">
        <MetricCard title="کامنت‌های دریافتی" value={analytics.totalCommentsReceived} helper="تعاملات ثبت‌شده" icon={<MessageSquareText size={20} />} tone="purple" />
        <MetricCard title="پیام‌های ورودی" value={analytics.totalInboundMessages} helper="دایرکت‌های دریافت‌شده" icon={<MessageCircle size={20} />} tone="cyan" />
        <MetricCard title="پاسخ‌های خصوصی" value={analytics.privateRepliesSent} helper="ارسال‌شده از طریق سناریوها" icon={<Send size={20} />} tone="indigo" />
        <MetricCard title="سرنخ‌های جذب‌شده" value={analytics.leadsCaptured} helper="کاربر باکیفیت برای پیگیری" icon={<Users size={20} />} tone="emerald" />
      </section>

      <section className="row g-3 g-xl-4 mb-4">
        <div className="col-12 col-xl-8">
          <div className="dashboard-card card h-100">
            <div className="card-body p-4">
              <ChartHeader
                icon={<Activity size={18} />}
                eyebrow="روند عملکرد"
                title="تعاملات و پاسخ‌های خودکار"
                helper="نمای روزانه بر اساس آمار ثبت‌شده در سیستم"
              />
              <div className="chart-shell chart-shell-lg">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceData} margin={{ top: 16, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="inboundGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-purple-500)" stopOpacity={0.42} />
                        <stop offset="95%" stopColor="var(--color-purple-500)" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="replyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-emerald-500)" stopOpacity={0.32} />
                        <stop offset="95%" stopColor="var(--color-emerald-500)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--dashboard-grid)" strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--dashboard-muted)', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--dashboard-muted)', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={chartTooltipStyle} cursor={{ stroke: 'var(--dashboard-grid)' }} />
                    <Area type="monotone" dataKey="inbound" name="ورودی" stroke="var(--color-purple-500)" fill="url(#inboundGradient)" strokeWidth={3} />
                    <Area type="monotone" dataKey="replies" name="پاسخ‌ها" stroke="var(--color-emerald-500)" fill="url(#replyGradient)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-legend mt-2">
                <span><i className="legend-dot legend-dot-primary" /> ورودی‌ها</span>
                <span><i className="legend-dot legend-dot-success" /> پاسخ‌های خودکار</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-4">
          <div className="dashboard-card card h-100">
            <div className="card-body p-4">
              <ChartHeader
                icon={<Gauge size={18} />}
                eyebrow="سلامت سیستم"
                title="وضعیت ارسال و سیاست‌ها"
                helper="شاخص‌های عملیاتی امروز"
              />
              <div className="health-score my-4">
                <div className="health-score-ring" style={{ '--score': `${Math.min(100, analytics.webhookDeliveryRate)}%` } as React.CSSProperties}>
                  <div>
                    <strong>{formatPercent(analytics.webhookDeliveryRate)}</strong>
                    <span>تحویل موفق</span>
                  </div>
                </div>
              </div>
              <div className="d-flex flex-column gap-3">
                <HealthRow label="تحویل وب‌هوک" value={analytics.webhookDeliveryRate} tone="success" />
                <HealthRow label="مسدودسازی سیاستی" value={analytics.policyBlockRate} tone="warning" inverse />
                <HealthRow label="نرخ تبدیل" value={analytics.conversionRate} tone="primary" />
              </div>
              <button className="btn btn-sm btn-outline-secondary w-100 mt-4" onClick={() => onNavigate('analytics')}>
                مشاهده گزارش کامل
                <ArrowUpRight size={15} className="me-1" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="row g-3 g-xl-4 mb-4">
        <div className="col-12 col-xl-8">
          <div className="dashboard-card card h-100">
            <div className="card-body p-4">
              <ChartHeader
                icon={<Rocket size={18} />}
                eyebrow="عملکرد روزانه"
                title="دریافت تا پاسخ"
                helper="مقایسه حجم رویدادها و خروجی اتوماسیون"
              />
              <div className="chart-shell chart-shell-md">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deliveryData} barGap={6} margin={{ top: 16, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="var(--dashboard-grid)" strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--dashboard-muted)', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--dashboard-muted)', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'var(--dashboard-hover)' }} />
                    <Bar dataKey="دریافت" name="دریافت" fill="var(--color-purple-500)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="پردازش" name="پردازش" fill="var(--color-cyan-500)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="پاسخ" name="پاسخ" fill="var(--color-emerald-500)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-4">
          <div className="dashboard-card card h-100">
            <div className="card-body p-4">
              <ChartHeader
                icon={<Sparkles size={18} />}
                eyebrow="قیف تعامل"
                title="ترکیب خروجی‌ها"
                helper="نسبت رویدادهای مهم کسب‌وکار"
              />
              <div className="chart-shell chart-shell-pie">
                {distributionData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={distributionData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={88} paddingAngle={4} stroke="none">
                        {distributionData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => formatNumber(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state">هنوز داده‌ای برای نمایش ثبت نشده است.</div>
                )}
              </div>
              <div className="d-flex flex-column gap-2">
                {distributionData.map((item) => (
                  <div className="d-flex align-items-center justify-content-between small" key={item.name}>
                    <span className="text-body-secondary"><i className="legend-dot ms-2" style={{ background: item.color }} />{item.name}</span>
                    <strong>{formatNumber(item.value)}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="row g-3 g-xl-4">
        <div className="col-12 col-xl-8">
          <div className="dashboard-card card">
            <div className="card-body p-4">
              <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
                <ChartHeader icon={<Clock3 size={18} />} eyebrow="مانیتور زنده" title="آخرین رویدادهای وب‌هوک" helper="آخرین رویدادهای دریافت‌شده از Meta" />
                <button className="btn btn-sm btn-link text-decoration-none dashboard-link" onClick={() => onNavigate('webhook_studio')}>مشاهده همه <ArrowUpRight size={14} /></button>
              </div>
              <div className="event-list">
                {recentEvents.length ? recentEvents.map((event) => {
                  const status = eventStatus(event.status);
                  return (
                    <div className="event-row" key={event.id}>
                      <div className="event-icon"><Activity size={17} /></div>
                      <div className="flex-grow-1 min-w-0">
                        <div className="d-flex flex-wrap align-items-center gap-2">
                          <strong>{eventLabel(event.eventType)}</strong>
                          <span className="event-fingerprint">{event.fingerprint.slice(0, 10)}…</span>
                        </div>
                        <p className="small text-body-secondary text-truncate mb-0 mt-1">{eventText(event)}</p>
                      </div>
                      <div className="text-start flex-shrink-0">
                        <span className={`badge text-bg-${status.tone}`}>{status.tone === 'success' ? <CheckCircle2 size={12} className="ms-1" /> : status.tone === 'danger' ? <XCircle size={12} className="ms-1" /> : null}{status.label}</span>
                        <div className="event-time">{new Date(event.receivedAt).toLocaleTimeString('fa-IR')}</div>
                      </div>
                    </div>
                  );
                }) : <div className="empty-state py-4">رویداد جدیدی دریافت نشده است.</div>}
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-xl-4">
          <div className="dashboard-card card h-100">
            <div className="card-body p-4 d-flex flex-column">
              <ChartHeader icon={<ShieldCheck size={18} />} eyebrow="کنترل کیفیت" title="امنیت و انطباق" helper="پیش‌نیازهای پاسخ‌گویی ایمن" />
              <div className="compliance-list mt-4">
                <div><span><ShieldCheck size={16} /> امضای HMAC</span><strong className="text-success">فعال</strong></div>
                <div><span><CheckCircle2 size={16} /> جلوگیری از تکرار</span><strong className="text-success">فعال</strong></div>
                <div><span><Workflow size={16} /> سناریوهای خودکار</span><strong>{formatNumber(analytics.activeAutomations)}</strong></div>
              </div>
              <div className="mt-auto pt-4">
                <button className="btn btn-primary w-100" onClick={() => onNavigate('automations')}>
                  مدیریت سناریوها
                  <ArrowUpLeft size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

interface MetricCardProps {
  title: string;
  value: number;
  helper: string;
  icon: React.ReactNode;
  tone: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, helper, icon, tone }) => (
  <div className="col-12 col-sm-6 col-xl-3">
    <div className={`metric-card metric-card-${tone} card h-100`}>
      <div className="card-body p-4">
        <div className="d-flex align-items-center justify-content-between gap-3">
          <span className="metric-label">{title}</span>
          <span className="metric-icon">{icon}</span>
        </div>
        <strong className="metric-value d-block mt-3">{formatNumber(value)}</strong>
        <span className="metric-helper">{helper}</span>
      </div>
    </div>
  </div>
);

interface ChartHeaderProps {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  helper: string;
}

const ChartHeader: React.FC<ChartHeaderProps> = ({ icon, eyebrow, title, helper }) => (
  <div className="chart-header">
    <div className="chart-header-icon">{icon}</div>
    <div>
      <span className="chart-eyebrow">{eyebrow}</span>
      <h2 className="h5 mb-1 mt-1">{title}</h2>
      <p className="small text-body-secondary mb-0">{helper}</p>
    </div>
  </div>
);

interface HealthRowProps {
  label: string;
  value: number;
  tone: string;
  inverse?: boolean;
}

const HealthRow: React.FC<HealthRowProps> = ({ label, value, tone, inverse }) => (
  <div>
    <div className="d-flex align-items-center justify-content-between small mb-2">
      <span className="text-body-secondary">{label}</span>
      <strong className={inverse ? 'text-warning' : `text-${tone}`}>{formatPercent(value)}</strong>
    </div>
    <div className="progress dashboard-progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={`progress-bar bg-${tone}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  </div>
);
