'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRequireAuth } from '@/lib/use-require-auth';
import { useI18n } from '@/lib/i18n';
import { AppShell } from '@/components/app-shell';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Copy, Trash2, ArrowUp, ArrowDown, X } from 'lucide-react';
import type { ManualTemplate, TemplateCustomField } from '@/lib/types';
import { SECTION_KEYS, HIDEABLE_SECTIONS, HIDEABLE_FIELDS, fieldsInSection, type SectionKey, type FieldKey } from '@/lib/manual-shape';

export default function TemplatesPage() {
  const { profile } = useAuth();
  const { loading } = useRequireAuth();
  const { t } = useI18n();
  const { toast } = useToast();

  const [templates, setTemplates] = useState<ManualTemplate[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [editing, setEditing] = useState<ManualTemplate | null>(null);
  const [editName, setEditName] = useState('');
  const [editHiddenFields, setEditHiddenFields] = useState<string[]>([]);
  const [editHiddenSections, setEditHiddenSections] = useState<string[]>([]);
  const [editCustomFields, setEditCustomFields] = useState<TemplateCustomField[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const plan = profile?.plan || 'free';

  const fetchTemplates = useCallback(async () => {
    const { data, error } = await supabase
      .from('manual_templates')
      .select('*, template_custom_fields (*)')
      .order('name');

    if (error) {
      toast({ title: t('templates.couldNotLoad'), description: error.message, variant: 'destructive' });
      return;
    }
    setTemplates((data as ManualTemplate[]) || []);
    setLoadingList(false);
  }, [toast, t]);

  useEffect(() => {
    if (loading) return;
    fetchTemplates();
  }, [loading, fetchTemplates]);

  const openNew = () => {
    setEditing({
      id: '',
      user_id: '',
      name: '',
      hidden_fields: [],
      hidden_sections: [],
      created_at: '',
      updated_at: '',
      template_custom_fields: [],
    });
    setEditName('');
    setEditHiddenFields([]);
    setEditHiddenSections([]);
    setEditCustomFields([]);
  };

  const openEdit = (tpl: ManualTemplate) => {
    setEditing(tpl);
    setEditName(tpl.name);
    setEditHiddenFields(tpl.hidden_fields || []);
    setEditHiddenSections(tpl.hidden_sections || []);
    setEditCustomFields(tpl.template_custom_fields || []);
  };

  const toggleSection = (section: SectionKey) => {
    setEditHiddenSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    );
  };

  const toggleField = (field: FieldKey) => {
    setEditHiddenFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const addCustomField = () => {
    setEditCustomFields((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        template_id: '',
        section_key: 'site',
        label: '',
        position: prev.length,
        created_at: '',
      },
    ]);
  };

  const updateCustomField = (id: string, key: 'section_key' | 'label', value: string) => {
    setEditCustomFields((prev) =>
      prev.map((cf) => (cf.id === id ? { ...cf, [key]: value } : cf))
    );
  };

  const removeCustomField = (id: string) => {
    setEditCustomFields((prev) => prev.filter((cf) => cf.id !== id));
  };

  const moveCustomField = (id: string, dir: 'up' | 'down') => {
    setEditCustomFields((prev) => {
      const idx = prev.findIndex((cf) => cf.id === id);
      if (idx === -1) return prev;
      const newIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next.map((cf, i) => ({ ...cf, position: i }));
    });
  };

  const handleSave = async () => {
    if (!editName.trim() || !editing) return;
    setSaving(true);

    const hiddenFields = editHiddenFields.filter(
      (f) => !editHiddenSections.includes(HIDEABLE_FIELDS.find((fk) => fk === f) ? 'site' : '')
    );
    const cleanHiddenFields = editHiddenFields.filter((f) => {
      const def = HIDEABLE_FIELDS.find((fk) => fk === f as FieldKey);
      if (!def) return false;
      const fieldDef = SECTION_KEYS;
      return true;
    });

    if (editing.id) {
      const { error } = await supabase
        .from('manual_templates')
        .update({
          name: editName.trim(),
          hidden_fields: editHiddenFields,
          hidden_sections: editHiddenSections,
        })
        .eq('id', editing.id);

      if (error) {
        setSaving(false);
        toast({ title: t('templates.couldNotSave'), description: error.message, variant: 'destructive' });
        return;
      }

      const existingIds = editCustomFields.filter((cf) => !cf.id.startsWith('new-')).map((cf) => cf.id);
      if (existingIds.length > 0) {
        await supabase.from('template_custom_fields').delete().in('id', existingIds).neq('id', '');
      }
      const allIds = editCustomFields.map((cf) => cf.id);
      await supabase.from('template_custom_fields').delete().in('id', allIds.filter((id) => !id.startsWith('new-')));

      const newFields = editCustomFields.filter((cf) => cf.label.trim());
      if (newFields.length > 0) {
        await supabase.from('template_custom_fields').insert(
          newFields.map((cf, i) => ({
            template_id: editing.id,
            section_key: cf.section_key,
            label: cf.label.trim(),
            position: i,
          }))
        );
      }
    } else {
      const { data, error } = await supabase
        .from('manual_templates')
        .insert({
          name: editName.trim(),
          hidden_fields: editHiddenFields,
          hidden_sections: editHiddenSections,
        })
        .select()
        .single();

      if (error) {
        setSaving(false);
        toast({ title: t('templates.couldNotSave'), description: error.message, variant: 'destructive' });
        return;
      }

      const newFields = editCustomFields.filter((cf) => cf.label.trim());
      if (newFields.length > 0 && data) {
        await supabase.from('template_custom_fields').insert(
          newFields.map((cf, i) => ({
            template_id: data.id,
            section_key: cf.section_key,
            label: cf.label.trim(),
            position: i,
          }))
        );
      }
    }

    setSaving(false);
    setEditing(null);
    toast({ title: t('templates.saved') });
    fetchTemplates();
  };

  const handleDuplicate = async (tpl: ManualTemplate) => {
    const { data, error } = await supabase
      .from('manual_templates')
      .insert({
        name: `${tpl.name} (copy)`,
        hidden_fields: tpl.hidden_fields || [],
        hidden_sections: tpl.hidden_sections || [],
      })
      .select()
      .single();

    if (error) {
      toast({ title: t('templates.couldNotDuplicate'), description: error.message, variant: 'destructive' });
      return;
    }

    if (tpl.template_custom_fields && tpl.template_custom_fields.length > 0 && data) {
      await supabase.from('template_custom_fields').insert(
        tpl.template_custom_fields.map((cf, i) => ({
          template_id: data.id,
          section_key: cf.section_key,
          label: cf.label,
          position: i,
        }))
      );
    }

    toast({ title: t('templates.duplicated') });
    fetchTemplates();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('manual_templates').delete().eq('id', deleteId);
    if (error) {
      toast({ title: t('templates.couldNotDelete'), description: error.message, variant: 'destructive' });
      return;
    }
    setDeleteId(null);
    toast({ title: t('templates.deleted') });
    fetchTemplates();
  };

  if (loading || loadingList) {
    return (
      <AppShell>
        <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
      </AppShell>
    );
  }

  if (plan === 'free') {
    return (
      <AppShell>
        <div className="mb-8">
          <h1 className="text-3xl tracking-tight-app">{t('templates.title')}</h1>
          <p className="mt-1 text-muted-foreground">{t('templates.subtitle')}</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium">{t('templates.freePlan')}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t('templates.freePlanDescription')}</p>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl tracking-tight-app">{t('templates.title')}</h1>
          <p className="mt-1 text-muted-foreground">{t('templates.subtitle')}</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          {t('templates.new')}
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg font-medium">{t('templates.empty')}</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">{t('templates.emptyDescription')}</p>
            <Button className="mt-4" onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              {t('templates.new')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((tpl) => (
            <Card key={tpl.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{tpl.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('templates.fieldsHidden', {
                      fields: (tpl.hidden_fields || []).length,
                      sections: (tpl.hidden_sections || []).length,
                      custom: (tpl.template_custom_fields || []).length,
                    })}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(tpl)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDuplicate(tpl)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(tpl.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <Dialog open onOpenChange={(open) => !open && setEditing(null)}>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing.id ? t('templates.editTitle') : t('templates.newTitle')}</DialogTitle>
              <DialogDescription>{t('templates.editorDescription')}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template_name">{t('templates.nameLabel')}</Label>
                <Input
                  id="template_name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={t('templates.namePlaceholder')}
                  autoFocus
                />
              </div>

              <div className="space-y-3">
                {HIDEABLE_SECTIONS.map((section) => (
                  <div key={section} className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`section-${section}`}
                        checked={!editHiddenSections.includes(section)}
                        onCheckedChange={() => toggleSection(section)}
                      />
                      <Label htmlFor={`section-${section}`} className="text-sm font-medium">
                        {t(`edit.sections.${section}`)}
                      </Label>
                    </div>
                    {!editHiddenSections.includes(section) && (
                      <div className="mt-2 ml-6 space-y-1.5">
                        {fieldsInSection(section).map((field) => (
                          <div key={field} className="flex items-center gap-2">
                            <Checkbox
                              id={`field-${field}`}
                              checked={!editHiddenFields.includes(field)}
                              onCheckedChange={() => toggleField(field)}
                            />
                            <Label htmlFor={`field-${field}`} className="text-sm text-muted-foreground">
                              {t(`edit.fields.${field.replace(/_./g, (m) => m[1].toUpperCase())}`)}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                <div className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <Checkbox id="section-emergency" checked disabled />
                    <Label htmlFor="section-emergency" className="text-sm font-medium">
                      {t('edit.sections.emergency')}
                    </Label>
                  </div>
                  <p className="ml-6 mt-1 text-xs text-muted-foreground">{t('templates.alwaysOn')}</p>
                </div>

                <div className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <Checkbox id="field-client_name" checked disabled />
                    <Label htmlFor="field-client_name" className="text-sm font-medium">
                      {t('edit.fields.clientName')}
                    </Label>
                  </div>
                  <p className="ml-6 mt-1 text-xs text-muted-foreground">{t('templates.alwaysOn')}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{t('templates.customFields')}</Label>
                  <Button variant="outline" size="sm" onClick={addCustomField}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('templates.addCustomField')}
                  </Button>
                </div>
                {editCustomFields.map((cf, i) => (
                  <div key={cf.id} className="flex items-start gap-2 rounded-lg border border-border p-3">
                    <div className="flex flex-col gap-0.5 pt-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" disabled={i === 0} onClick={() => moveCustomField(cf.id, 'up')}>
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" disabled={i === editCustomFields.length - 1} onClick={() => moveCustomField(cf.id, 'down')}>
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input
                        value={cf.label}
                        onChange={(e) => updateCustomField(cf.id, 'label', e.target.value)}
                        placeholder={t('templates.customFieldLabel')}
                        className="text-sm"
                      />
                      <Select value={cf.section_key} onValueChange={(v) => updateCustomField(cf.id, 'section_key', v)}>
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SECTION_KEYS.map((sk) => (
                            <SelectItem key={sk} value={sk}>{t(`edit.sections.${sk}`)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeCustomField(cf.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSave} disabled={saving || !editName.trim()}>
                {saving ? t('common.saving') : t('templates.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('templates.deleteTitle')}</DialogTitle>
            <DialogDescription>{t('templates.deleteDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t('templates.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
