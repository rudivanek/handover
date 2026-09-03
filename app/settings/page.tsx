'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRequireAuth } from '@/lib/use-require-auth';
import { useI18n, persistUiLocale } from '@/lib/i18n';
import { AppShell } from '@/components/app-shell';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Save, Palette, Clock, Mail, Phone, Building2, CreditCard, CheckCircle2, Globe, Upload, X, Link2, Type, ArrowUpRight } from 'lucide-react';
import type { Locale } from '@/lib/types';
import { fonts, sansFontOptions, serifFontOptions, getFontDef, SYSTEM_STACK, SERIF_STACK } from '@/lib/fonts';

type LogoMode = 'upload' | 'url';

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const { loading } = useRequireAuth();
  const { locale, setLocale, t } = useI18n();
  const { toast } = useToast();

  const [agencyName, setAgencyName] = useState('');
  const [agencyWebsite, setAgencyWebsite] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoStoragePath, setLogoStoragePath] = useState<string | null>(null);
  const [logoMode, setLogoMode] = useState<LogoMode>('upload');
  const [logoUrlInput, setLogoUrlInput] = useState('');
  const [logoUrlError, setLogoUrlError] = useState(false);
  const [brandColor, setBrandColor] = useState('#1f2937');
  const [headingFontKey, setHeadingFontKey] = useState('system');
  const [bodyFontKey, setBodyFontKey] = useState('system');
  const [customFontName, setCustomFontName] = useState('');
  const [customFontUrl, setCustomFontUrl] = useState('');
  const [customFontNameError, setCustomFontNameError] = useState(false);
  const [customFontUrlError, setCustomFontUrlError] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportHours, setSupportHours] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setAgencyName(profile.agency_name ?? '');
      setAgencyWebsite(profile.agency_website ?? '');
      setLogoUrl(profile.logo_url ?? '');
      setLogoStoragePath(profile.logo_storage_path ?? null);
      setLogoMode(profile.logo_storage_path ? 'upload' : 'url');
      setLogoUrlInput(profile.logo_url ?? '');
      setBrandColor(profile.brand_color ?? '#1f2937');
      setSupportEmail(profile.support_email ?? '');
      setSupportHours(profile.support_hours ?? '');
      setEmergencyPhone(profile.emergency_phone ?? '');
      setHeadingFontKey(profile.heading_font_key ?? 'system');
      setBodyFontKey(profile.body_font_key ?? 'system');
      setCustomFontName(profile.custom_font_name ?? '');
      setCustomFontUrl(profile.custom_font_url ?? '');
    }
  }, [profile]);

  if (loading || !profile) {
    return (
      <AppShell>
        <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
      </AppShell>
    );
  }

  const deleteStoredLogo = async () => {
    if (logoStoragePath) {
      try {
        await supabase.storage.from('logos').remove([logoStoragePath]);
      } catch {}
    }
  };

  const handleLogoUpload = async (file: File) => {
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({ title: t('settings.couldNotSave'), description: t('settings.logoRejection'), variant: 'destructive' });
      return;
    }
    if (file.size > 2097152) {
      toast({ title: t('settings.couldNotSave'), description: t('settings.logoRejection'), variant: 'destructive' });
      return;
    }
    setUploading(true);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const path = `${profile.user_id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('logos').upload(path, file);
    if (uploadError) {
      setUploading(false);
      toast({ title: t('settings.couldNotSave'), description: uploadError.message, variant: 'destructive' });
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path);
    await deleteStoredLogo();
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ logo_url: publicUrl, logo_storage_path: path })
      .eq('user_id', profile.user_id);
    setUploading(false);
    if (updateError) {
      toast({ title: t('settings.couldNotSave'), description: updateError.message, variant: 'destructive' });
      return;
    }
    setLogoUrl(publicUrl);
    setLogoStoragePath(path);
    setLogoUrlInput('');
    await refreshProfile();
    toast({ title: t('settings.saved'), description: t('settings.savedDesc') });
  };

  const handleLogoUrlSave = async () => {
    const url = logoUrlInput.trim();
    if (!url) return;
    if (!url.match(/^https:\/\//i)) {
      setLogoUrlError(true);
      return;
    }
    setLogoUrlError(false);
    setSaving(true);
    await deleteStoredLogo();
    const { error } = await supabase
      .from('profiles')
      .update({ logo_url: url, logo_storage_path: null })
      .eq('user_id', profile.user_id);
    setSaving(false);
    if (error) {
      toast({ title: t('settings.couldNotSave'), description: error.message, variant: 'destructive' });
      return;
    }
    setLogoUrl(url);
    setLogoStoragePath(null);
    await refreshProfile();
    toast({ title: t('settings.saved'), description: t('settings.savedDesc') });
  };

  const handleLogoRemove = async () => {
    await deleteStoredLogo();
    const { error } = await supabase
      .from('profiles')
      .update({ logo_url: null, logo_storage_path: null })
      .eq('user_id', profile.user_id);
    if (error) {
      toast({ title: t('settings.couldNotSave'), description: error.message, variant: 'destructive' });
      return;
    }
    setLogoUrl('');
    setLogoStoragePath(null);
    setLogoUrlInput('');
    await refreshProfile();
    toast({ title: t('settings.saved'), description: t('settings.savedDesc') });
  };

  const normalizeUrl = (value: string): string => {
    const v = value.trim();
    if (!v) return '';
    if (v.match(/^[a-z]+:\/\//i) || v.includes('@')) return v;
    return `https://${v}`;
  };

  const validateCustomFontName = (value: string): boolean => {
    return /^[A-Za-z0-9 _-]{1,40}$/.test(value.trim());
  };

  const validateCustomFontUrl = (value: string): string => {
    const v = value.trim();
    if (!v) return 'empty';
    if (/fonts\.googleapis\.com/i.test(v)) return 'stylesheet';
    if (!v.match(/^https:\/\//i)) return 'scheme';
    if (!v.match(/\.(woff2|woff|otf|ttf)(\?[^"'\s]*)?$/i)) return 'extension';
    return '';
  };

  const customInUse = headingFontKey === 'custom' || bodyFontKey === 'custom';
  const customReady = customFontName.trim() && customFontUrl.trim();
  const effectiveHeadingKey = headingFontKey === 'custom' && !customReady ? 'system' : headingFontKey;
  const effectiveBodyKey = bodyFontKey === 'custom' && !customReady ? 'system' : bodyFontKey;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload: Record<string, string | null> = {
      agency_name: agencyName,
      agency_website: normalizeUrl(agencyWebsite),
      logo_url: logoUrl,
      brand_color: brandColor,
      support_email: supportEmail,
      support_hours: supportHours,
      emergency_phone: emergencyPhone,
      heading_font_key: effectiveHeadingKey,
      body_font_key: effectiveBodyKey,
      custom_font_name: customInUse && customReady ? customFontName.trim() : null,
      custom_font_url: customInUse && customReady ? customFontUrl.trim() : null,
    };

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('user_id', profile.user_id);

    setSaving(false);

    if (error) {
      toast({ title: t('settings.couldNotSave'), description: error.message, variant: 'destructive' });
      return;
    }

    await refreshProfile();
    toast({ title: t('settings.saved'), description: t('settings.savedDesc') });
  };

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    persistUiLocale(profile.user_id, newLocale);
  };

  const presetColors = ['#1f2937', '#0f4c5c', '#1d4e89', '#2d5a27', '#7c2d12', '#9d4e2c', '#4a3f35'];

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-3xl tracking-tight-app">{t('settings.title')}</h1>
        <p className="mt-1 text-muted-foreground">
          {t('settings.subtitle')}
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              {t('settings.identity')}
            </CardTitle>
            <CardDescription>{t('settings.identityDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agency_name">{t('settings.agencyName')}</Label>
              <Input
                id="agency_name"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                placeholder="Northwind Studio"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agency_website">{t('settings.agencyWebsite')}</Label>
              <Input
                id="agency_website"
                value={agencyWebsite}
                onChange={(e) => setAgencyWebsite(e.target.value)}
                onBlur={() => setAgencyWebsite(normalizeUrl(agencyWebsite))}
                placeholder="https://youragency.com"
              />
              <p className="text-xs text-muted-foreground">
                {t('settings.agencyWebsiteHelp')}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{t('settings.logoUpload')}</Label>
              <div className="flex gap-1 rounded-lg border border-border p-1">
                <button
                  type="button"
                  onClick={() => setLogoMode('upload')}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    logoMode === 'upload'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  {t('settings.logoModeUpload')}
                </button>
                <button
                  type="button"
                  onClick={() => setLogoMode('url')}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    logoMode === 'url'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Link2 className="h-4 w-4" />
                  {t('settings.logoModeUrl')}
                </button>
              </div>

              {logoUrl && (
                <div className="flex items-center gap-4">
                  <div className="rounded-lg border border-border bg-secondary/30 p-4">
                    <img
                      src={logoUrl}
                      alt="Logo preview"
                      className="max-h-16 max-w-xs object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                    />
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={handleLogoRemove} disabled={uploading || saving}>
                    <X className="mr-2 h-4 w-4" />
                    {t('settings.logoRemove')}
                  </Button>
                </div>
              )}

              {logoMode === 'upload' && (
                <>
                  {!logoUrl && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                    >
                      <Upload className="mb-2 h-6 w-6" />
                      <span className="text-sm">{t('settings.logoDrop')}</span>
                    </button>
                  )}
                  {logoUrl && (
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      <Upload className="mr-2 h-4 w-4" />
                      {t('settings.logoReplace')}
                    </Button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoUpload(file);
                      e.target.value = '';
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('settings.logoRejection')}
                  </p>
                </>
              )}

              {logoMode === 'url' && (
                <>
                  <div className="flex gap-2">
                    <Input
                      value={logoUrlInput}
                      onChange={(e) => { setLogoUrlInput(e.target.value); setLogoUrlError(false); }}
                      placeholder="https://youragency.com/logo.png"
                      className={logoUrlError ? 'border-destructive' : ''}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={handleLogoUrlSave} disabled={saving || !logoUrlInput.trim()}>
                      {t('settings.logoUrlApply')}
                    </Button>
                  </div>
                  {logoUrlError && (
                    <p className="text-xs text-destructive">
                      {t('settings.logoUrlSchemeError')}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t('settings.logoUrlHelp')}
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Palette className="h-5 w-5 text-muted-foreground" />
              {t('settings.brandColor')}
            </CardTitle>
            <CardDescription>
              {t('settings.brandColorDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border border-border"
              />
              <Input
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="max-w-[160px]"
                placeholder="#1f2937"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {presetColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setBrandColor(c)}
                  className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: brandColor.toLowerCase() === c ? '#fff' : 'transparent',
                    boxShadow: brandColor.toLowerCase() === c ? `0 0 0 2px ${c}` : 'none',
                  }}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">{t('settings.preview')}</p>
              <h3 className="mt-1 text-xl" style={{ color: brandColor }}>
                {t('settings.previewHeading')}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('settings.previewBody')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Type className="h-5 w-5 text-muted-foreground" />
              {t('settings.typeface')}
            </CardTitle>
            <CardDescription>{t('settings.typefaceDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="heading_font_key">{t('settings.headingFont')}</Label>
                <select
                  id="heading_font_key"
                  value={headingFontKey}
                  onChange={(e) => setHeadingFontKey(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <optgroup label={t('settings.fontGroupSans')}>
                    {sansFontOptions.map((opt) => (
                      <option key={opt.slug} value={opt.slug} className={opt.className || undefined} style={opt.className ? { fontFamily: fonts[opt.slug].fontFamily } : undefined}>
                        {opt.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label={t('settings.fontGroupSerif')}>
                    {serifFontOptions.map((opt) => (
                      <option key={opt.slug} value={opt.slug} className={opt.className || undefined} style={opt.className ? { fontFamily: fonts[opt.slug].fontFamily } : undefined}>
                        {opt.label}
                      </option>
                    ))}
                  </optgroup>
                  <option value="custom">{t('settings.typefaceCustom')}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="body_font_key">{t('settings.bodyFont')}</Label>
                <select
                  id="body_font_key"
                  value={bodyFontKey}
                  onChange={(e) => setBodyFontKey(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <optgroup label={t('settings.fontGroupSans')}>
                    {sansFontOptions.map((opt) => (
                      <option key={opt.slug} value={opt.slug} className={opt.className || undefined} style={opt.className ? { fontFamily: fonts[opt.slug].fontFamily } : undefined}>
                        {opt.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label={t('settings.fontGroupSerif')}>
                    {serifFontOptions.map((opt) => (
                      <option key={opt.slug} value={opt.slug} className={opt.className || undefined} style={opt.className ? { fontFamily: fonts[opt.slug].fontFamily } : undefined}>
                        {opt.label}
                      </option>
                    ))}
                  </optgroup>
                  <option value="custom">{t('settings.typefaceCustom')}</option>
                </select>
              </div>
            </div>

            {customInUse && (
              <div className="space-y-3 rounded-lg border border-border p-4">
                <div className="space-y-2">
                  <Label htmlFor="custom_font_name">{t('settings.customFontName')}</Label>
                  <Input
                    id="custom_font_name"
                    value={customFontName}
                    onChange={(e) => { setCustomFontName(e.target.value); setCustomFontNameError(false); }}
                    onBlur={() => setCustomFontNameError(!validateCustomFontName(customFontName))}
                    placeholder="Brand Sans"
                    className={customFontNameError ? 'border-destructive' : ''}
                  />
                  {customFontNameError && (
                    <p className="text-xs text-destructive">{t('settings.customFontNameError')}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom_font_url">{t('settings.customFontUrl')}</Label>
                  <Input
                    id="custom_font_url"
                    value={customFontUrl}
                    onChange={(e) => { setCustomFontUrl(e.target.value); setCustomFontUrlError(''); }}
                    onBlur={() => setCustomFontUrlError(validateCustomFontUrl(customFontUrl))}
                    placeholder="https://cdn.youragency.com/fonts/brand.woff2"
                    className={customFontUrlError ? 'border-destructive' : ''}
                  />
                  {customFontUrlError === 'stylesheet' && (
                    <p className="text-xs text-destructive">{t('settings.customFontUrlStylesheetError')}</p>
                  )}
                  {customFontUrlError === 'scheme' && (
                    <p className="text-xs text-destructive">{t('settings.customFontUrlSchemeError')}</p>
                  )}
                  {customFontUrlError === 'extension' && (
                    <p className="text-xs text-destructive">{t('settings.customFontUrlExtensionError')}</p>
                  )}
                </div>
              </div>
            )}

            <div className={`rounded-lg border border-border p-4 ${getFontDef(headingFontKey === 'custom' && customReady ? 'system' : headingFontKey).variable} ${getFontDef(bodyFontKey === 'custom' && customReady ? 'system' : bodyFontKey).variable}`}>
              <p className="text-xs text-muted-foreground" style={{ fontFamily: 'inherit' }}>{t('settings.typefacePreview')}</p>
              <h3 className="mt-2 text-xl" style={{ color: brandColor, fontFamily: headingFontKey === 'custom' && customReady ? `'${customFontName.trim()}', ${SERIF_STACK}` : getFontDef(headingFontKey).fontFamily }}>
                {agencyName || (locale === 'es' ? 'Tu agencia' : 'Your Agency')}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground" style={{ fontFamily: bodyFontKey === 'custom' && customReady ? `'${customFontName.trim()}', ${SYSTEM_STACK}` : getFontDef(bodyFontKey).fontFamily }}>
                {t('settings.typefacePreviewBody')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5 text-muted-foreground" />
              {t('settings.language')}
            </CardTitle>
            <CardDescription>
              {t('settings.languageDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={locale === 'en' ? 'default' : 'outline'}
                onClick={() => handleLocaleChange('en')}
              >
                English
              </Button>
              <Button
                type="button"
                variant={locale === 'es' ? 'default' : 'outline'}
                onClick={() => handleLocaleChange('es')}
              >
                Español
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5 text-muted-foreground" />
              {t('settings.support')}
            </CardTitle>
            <CardDescription>
              {t('settings.supportDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="support_email" className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> {t('settings.supportEmail')}
              </Label>
              <Input
                id="support_email"
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder="support@youragency.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support_hours" className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> {t('settings.supportHours')}
              </Label>
              <Input
                id="support_hours"
                value={supportHours}
                onChange={(e) => setSupportHours(e.target.value)}
                placeholder="Mon–Fri, 9am–5pm GMT"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency_phone" className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> {t('settings.emergencyPhone')}
              </Label>
              <Input
                id="emergency_phone"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                placeholder="+44 20 1234 5678"
              />
              <p className="text-xs text-muted-foreground">
                {t('settings.emergencyPhoneHelp')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              {t('settings.billing')}
            </CardTitle>
            <CardDescription>
              {t('settings.billingDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile.plan === 'paid' ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="text-sm font-medium">{t('settings.paidPlan')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium">{t('settings.freePlan')}</p>
                {process.env.NEXT_PUBLIC_STRIPE_LINK && (
                  <>
                    <Button asChild size="sm">
                      <a href={process.env.NEXT_PUBLIC_STRIPE_LINK} target="_blank" rel="noopener noreferrer">
                        {t('settings.upgrade')}
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.upgradePrice')}
                    </p>
                  </>
                )}
                <p className="text-xs text-muted-foreground">
                  {t('settings.upgradeNote')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} size="lg">
            <Save className="mr-2 h-4 w-4" />
            {saving ? t('common.saving') : t('settings.saveSettings')}
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
