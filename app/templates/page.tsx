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
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Pencil, Copy, Trash2, ArrowUp, ArrowDown, X, Wand2 } from 'lucide-react';
import type {
  ManualTemplate,
  TemplateCustomField,
  TemplateMaintenanceTask,
  TemplateCoverage,
  TemplateEditBlock,
  TemplateAccount,
  MaintenanceCadence,
  MaintenanceOwner,
  Locale,
} from '@/lib/types';
import { SECTION_KEYS, HIDEABLE_SECTIONS, HIDEABLE_FIELDS, fieldsInSection, FIELD_KEYS, type SectionKey, type FieldKey } from '@/lib/manual-shape';
import maintenancePresets from '@/data/maintenance-presets.json';

const CADENCES: MaintenanceCadence[] = ['daily', 'weekly', 'monthly', 'annual'];
const OWNERS: MaintenanceOwner[] = ['agency', 'client', 'shared'];

export default function TemplatesPage() {
  const { profile, profileLoaded } = useAuth();
  const { loading } = useRequireAuth();
  const { locale, t } = useI18n();
  const { toast } = useToast();

  const [templates, setTemplates] = useState<ManualTemplate[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [editing, setEditing] = useState<ManualTemplate | null>(null);
  const [editName, setEditName] = useState('');
  const [editHiddenFields, setEditHiddenFields] = useState<string[]>([]);
  const [editHiddenSections, setEditHiddenSections] = useState<string[]>([]);
  const [editCustomFields, setEditCustomFields] = useState<TemplateCustomField[]>([]);
  const [editMaintenance, setEditMaintenance] = useState<TemplateMaintenanceTask[]>([]);
  const [editCoverage, setEditCoverage] = useState<TemplateCoverage[]>([]);
  const [editBlocks, setEditBlocks] = useState<TemplateEditBlock[]>([]);
  const [editAccounts, setEditAccounts] = useState<TemplateAccount[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const plan = profile?.plan || 'free';
  const uiLocale: Locale = locale;

  const fetchTemplates = useCallback(async () => {
    const { data, error } = await supabase
      .from('manual_templates')
      .select(`
        *,
        template_custom_fields (*),
        template_maintenance_tasks (*),
        template_coverage (*),
        template_edit_blocks (*),
        template_accounts (*)
      `)
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
      template_maintenance_tasks: [],
      template_coverage: [],
      template_edit_blocks: [],
      template_accounts: [],
    });
    setEditName('');
    setEditHiddenFields([]);
    setEditHiddenSections([]);
    setEditCustomFields([]);
    setEditMaintenance([]);
    setEditCoverage([]);
    setEditBlocks([]);
    setEditAccounts([]);
  };

  const openEdit = (tpl: ManualTemplate) => {
    setEditing(tpl);
    setEditName(tpl.name);
    setEditHiddenFields(tpl.hidden_fields || []);
    setEditHiddenSections(tpl.hidden_sections || []);
    setEditCustomFields(tpl.template_custom_fields || []);
    setEditMaintenance((tpl.template_maintenance_tasks || []).sort((a, b) => a.sort_order - b.sort_order));
    setEditCoverage(tpl.template_coverage || []);
    setEditBlocks(tpl.template_edit_blocks || []);
    setEditAccounts(tpl.template_accounts || []);
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

  // -- Custom fields --
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

  // -- Maintenance --
  const addMaintenanceTask = () => {
    setEditMaintenance((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        template_id: '',
        task: '',
        cadence: 'monthly',
        owner: 'agency',
        notes: '',
        sort_order: prev.length,
        created_at: '',
      },
    ]);
  };

  const updateMaintenance = (id: string, key: 'task' | 'cadence' | 'owner' | 'notes', value: string) => {
    setEditMaintenance((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [key]: value } as TemplateMaintenanceTask : m))
    );
  };

  const removeMaintenance = (id: string) => {
    setEditMaintenance((prev) => prev.filter((m) => m.id !== id));
  };

  const moveMaintenance = (id: string, dir: 'up' | 'down') => {
    setEditMaintenance((prev) => {
      const idx = prev.findIndex((m) => m.id === id);
      if (idx === -1) return prev;
      const newIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next.map((m, i) => ({ ...m, sort_order: i }));
    });
  };

  const addStandardSchedule = () => {
    const rows = maintenancePresets as Array<{ cadence: MaintenanceCadence; owner: MaintenanceOwner; en: string; es: string }>;
    const localeKey = uiLocale === 'es' ? 'es' : 'en';
    const cadenceCounters: Record<string, number> = {};
    const newTasks: TemplateMaintenanceTask[] = rows.map((row) => {
      const idx = cadenceCounters[row.cadence] ?? 0;
      cadenceCounters[row.cadence] = idx + 1;
      return {
        id: `new-${Date.now()}-${idx}-${row.cadence}`,
        template_id: '',
        task: row[localeKey],
        cadence: row.cadence,
        owner: row.owner,
        notes: '',
        sort_order: editMaintenance.length + idx,
        created_at: '',
      };
    });
    setEditMaintenance((prev) => [...prev, ...newTasks]);
  };

  // -- Coverage --
  const addCoverageItem = () => {
    setEditCoverage((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        template_id: '',
        item: '',
        included: true,
        created_at: '',
      },
    ]);
  };

  const updateCoverage = (id: string, key: 'item' | 'included', value: string | boolean) => {
    setEditCoverage((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [key]: value } as TemplateCoverage : c))
    );
  };

  const removeCoverage = (id: string) => {
    setEditCoverage((prev) => prev.filter((c) => c.id !== id));
  };

  // -- Edit blocks --
  const addEditBlock = () => {
    setEditBlocks((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        template_id: '',
        block_name: '',
        instructions: '',
        created_at: '',
      },
    ]);
  };

  const updateEditBlock = (id: string, key: 'block_name' | 'instructions', value: string) => {
    setEditBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [key]: value } as TemplateEditBlock : b))
    );
  };

  const removeEditBlock = (id: string) => {
    setEditBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  // -- Accounts --
  const addAccount = () => {
    setEditAccounts((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        template_id: '',
        service: '',
        account_owner: '',
        created_at: '',
      },
    ]);
  };

  const updateAccount = (id: string, key: 'service' | 'account_owner', value: string) => {
    setEditAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [key]: value } as TemplateAccount : a))
    );
  };

  const removeAccount = (id: string) => {
    setEditAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSave = async () => {
    if (!editName.trim() || !editing) return;
    setSaving(true);

    const safeHiddenFields = editHiddenFields.filter((f) => HIDEABLE_FIELDS.includes(f as FieldKey));
    const safeHiddenSections = editHiddenSections.filter((s) => HIDEABLE_SECTIONS.includes(s as SectionKey));

    if (editing.id) {
      const { error } = await supabase
        .from('manual_templates')
        .update({
          name: editName.trim(),
          hidden_fields: safeHiddenFields,
          hidden_sections: safeHiddenSections,
        })
        .eq('id', editing.id);

      if (error) {
        setSaving(false);
        toast({ title: t('templates.couldNotSave'), description: error.message, variant: 'destructive' });
        return;
      }

      // Replace all child rows
      await supabase.from('template_custom_fields').delete().eq('template_id', editing.id);
      await supabase.from('template_maintenance_tasks').delete().eq('template_id', editing.id);
      await supabase.from('template_coverage').delete().eq('template_id', editing.id);
      await supabase.from('template_edit_blocks').delete().eq('template_id', editing.id);
      await supabase.from('template_accounts').delete().eq('template_id', editing.id);

      const validCustomFields = editCustomFields.filter((cf) => cf.label.trim());
      if (validCustomFields.length > 0) {
        await supabase.from('template_custom_fields').insert(
          validCustomFields.map((cf, i) => ({
            template_id: editing.id,
            section_key: cf.section_key,
            label: cf.label.trim(),
            position: i,
          }))
        );
      }

      const validMaintenance = editMaintenance.filter((m) => m.task.trim());
      if (validMaintenance.length > 0) {
        await supabase.from('template_maintenance_tasks').insert(
          validMaintenance.map((m, i) => ({
            template_id: editing.id,
            task: m.task.trim(),
            cadence: m.cadence,
            owner: m.owner,
            notes: m.notes,
            sort_order: i,
          }))
        );
      }

      const validCoverage = editCoverage.filter((c) => c.item?.trim());
      if (validCoverage.length > 0) {
        await supabase.from('template_coverage').insert(
          validCoverage.map((c) => ({
            template_id: editing.id,
            item: c.item,
            included: c.included,
          }))
        );
      }

      const validBlocks = editBlocks.filter((b) => b.block_name?.trim() || b.instructions?.trim());
      if (validBlocks.length > 0) {
        await supabase.from('template_edit_blocks').insert(
          validBlocks.map((b) => ({
            template_id: editing.id,
            block_name: b.block_name,
            instructions: b.instructions,
          }))
        );
      }

      const validAccounts = editAccounts.filter((a) => a.service?.trim() || a.account_owner?.trim());
      if (validAccounts.length > 0) {
        await supabase.from('template_accounts').insert(
          validAccounts.map((a) => ({
            template_id: editing.id,
            service: a.service,
            account_owner: a.account_owner,
          }))
        );
      }
    } else {
      const { data, error } = await supabase
        .from('manual_templates')
        .insert({
          name: editName.trim(),
          hidden_fields: safeHiddenFields,
          hidden_sections: safeHiddenSections,
        })
        .select()
        .single();

      if (error) {
        setSaving(false);
        toast({ title: t('templates.couldNotSave'), description: error.message, variant: 'destructive' });
        return;
      }

      if (data) {
        const validCustomFields = editCustomFields.filter((cf) => cf.label.trim());
        if (validCustomFields.length > 0) {
          await supabase.from('template_custom_fields').insert(
            validCustomFields.map((cf, i) => ({
              template_id: data.id,
              section_key: cf.section_key,
              label: cf.label.trim(),
              position: i,
            }))
          );
        }

        const validMaintenance = editMaintenance.filter((m) => m.task.trim());
        if (validMaintenance.length > 0) {
          await supabase.from('template_maintenance_tasks').insert(
            validMaintenance.map((m, i) => ({
              template_id: data.id,
              task: m.task.trim(),
              cadence: m.cadence,
              owner: m.owner,
              notes: m.notes,
              sort_order: i,
            }))
          );
        }

        const validCoverage = editCoverage.filter((c) => c.item?.trim());
        if (validCoverage.length > 0) {
          await supabase.from('template_coverage').insert(
            validCoverage.map((c) => ({
              template_id: data.id,
              item: c.item,
              included: c.included,
            }))
          );
        }

        const validBlocks = editBlocks.filter((b) => b.block_name?.trim() || b.instructions?.trim());
        if (validBlocks.length > 0) {
          await supabase.from('template_edit_blocks').insert(
            validBlocks.map((b) => ({
              template_id: data.id,
              block_name: b.block_name,
              instructions: b.instructions,
            }))
          );
        }

        const validAccounts = editAccounts.filter((a) => a.service?.trim() || a.account_owner?.trim());
        if (validAccounts.length > 0) {
          await supabase.from('template_accounts').insert(
            validAccounts.map((a) => ({
              template_id: data.id,
              service: a.service,
              account_owner: a.account_owner,
            }))
          );
        }
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
        hidden_fields: (tpl.hidden_fields || []).filter((f) => HIDEABLE_FIELDS.includes(f as FieldKey)),
        hidden_sections: (tpl.hidden_sections || []).filter((s) => HIDEABLE_SECTIONS.includes(s as SectionKey)),
      })
      .select()
      .single();

    if (error) {
      toast({ title: t('templates.couldNotDuplicate'), description: error.message, variant: 'destructive' });
      return;
    }

    if (data) {
      const cf = tpl.template_custom_fields || [];
      if (cf.length > 0) {
        await supabase.from('template_custom_fields').insert(
          cf.map((f, i) => ({ template_id: data.id, section_key: f.section_key, label: f.label, position: i }))
        );
      }
      const mt = tpl.template_maintenance_tasks || [];
      if (mt.length > 0) {
        await supabase.from('template_maintenance_tasks').insert(
          mt.map((m, i) => ({ template_id: data.id, task: m.task, cadence: m.cadence, owner: m.owner, notes: m.notes, sort_order: i }))
        );
      }
      const cv = tpl.template_coverage || [];
      if (cv.length > 0) {
        await supabase.from('template_coverage').insert(
          cv.map((c) => ({ template_id: data.id, item: c.item, included: c.included }))
        );
      }
      const eb = tpl.template_edit_blocks || [];
      if (eb.length > 0) {
        await supabase.from('template_edit_blocks').insert(
          eb.map((b) => ({ template_id: data.id, block_name: b.block_name, instructions: b.instructions }))
        );
      }
      const ac = tpl.template_accounts || [];
      if (ac.length > 0) {
        await supabase.from('template_accounts').insert(
          ac.map((a) => ({ template_id: data.id, service: a.service, account_owner: a.account_owner }))
        );
      }
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

  if (loading || !profileLoaded || loadingList) {
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

  const maintenanceByCadence = (cadence: MaintenanceCadence) =>
    editMaintenance.filter((m) => m.cadence === cadence);

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
                  {((tpl.template_maintenance_tasks || []).length > 0 ||
                    (tpl.template_coverage || []).length > 0 ||
                    (tpl.template_edit_blocks || []).length > 0 ||
                    (tpl.template_accounts || []).length > 0) && (
                    <p className="mt-0.5 text-xs text-muted-foreground/70">
                      {[
                        tpl.template_maintenance_tasks?.length || 0,
                        tpl.template_coverage?.length || 0,
                        tpl.template_edit_blocks?.length || 0,
                        tpl.template_accounts?.length || 0,
                      ].filter((n) => n > 0).length} {t('templates.contentSections')}
                    </p>
                  )}
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

              {/* Shape controls */}
              <div className="space-y-3">
                {SECTION_KEYS.map((section) => {
                  const isHideable = HIDEABLE_SECTIONS.includes(section);
                  const isHidden = editHiddenSections.includes(section);
                  return (
                    <div key={section} className="rounded-lg border border-border p-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`section-${section}`}
                          checked={isHideable ? !isHidden : true}
                          disabled={!isHideable}
                          onCheckedChange={() => isHideable && toggleSection(section)}
                        />
                        <Label htmlFor={`section-${section}`} className="text-sm font-medium">
                          {t(`edit.sections.${section}`)}
                        </Label>
                      </div>
                      {!isHidden && (
                        <div className="mt-2 ml-6 space-y-1.5">
                          {fieldsInSection(section).map((field) => {
                            const fieldHideable = HIDEABLE_FIELDS.includes(field);
                            return (
                              <div key={field} className="flex items-center gap-2">
                                <Checkbox
                                  id={`field-${field}`}
                                  checked={fieldHideable ? !editHiddenFields.includes(field) : true}
                                  disabled={!fieldHideable}
                                  onCheckedChange={() => fieldHideable && toggleField(field)}
                                />
                                <Label htmlFor={`field-${field}`} className="text-sm text-muted-foreground">
                                  {t(`edit.fields.${field.replace(/_./g, (m) => m[1].toUpperCase())}`)}
                                </Label>
                              </div>
                            );
                          })}
                          {!isHideable && (
                            <p className="text-xs text-muted-foreground">{t('templates.alwaysOn')}</p>
                          )}
                        </div>
                      )}
                      {!isHideable && (
                        <p className="ml-6 mt-1 text-xs text-muted-foreground">{t('templates.alwaysOn')}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Custom fields */}
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

              {/* Maintenance schedule */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{t('templates.maintenance')}</Label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={addStandardSchedule}>
                      <Wand2 className="mr-2 h-4 w-4" />
                      {t('templates.addStandardSchedule')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={addMaintenanceTask}>
                      <Plus className="mr-2 h-4 w-4" />
                      {t('templates.addTask')}
                    </Button>
                  </div>
                </div>
                {editMaintenance.length === 0 && (
                  <p className="text-sm text-muted-foreground">{t('templates.maintenanceEmpty')}</p>
                )}
                {CADENCES.map((cadence) => {
                  const tasks = maintenanceByCadence(cadence);
                  if (tasks.length === 0) return null;
                  return (
                    <div key={cadence} className="rounded-lg border border-border p-3">
                      <p className="mb-2 text-sm font-medium capitalize">{t(`edit.maintenance.${cadence}`)}</p>
                      <div className="space-y-2">
                        {tasks.map((m) => (
                          <div key={m.id} className="flex items-start gap-2">
                            <div className="flex flex-col gap-0.5 pt-1">
                              <Button variant="ghost" size="icon" className="h-6 w-6" disabled={editMaintenance.indexOf(m) === 0} onClick={() => moveMaintenance(m.id, 'up')}>
                                <ArrowUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6" disabled={editMaintenance.indexOf(m) === editMaintenance.length - 1} onClick={() => moveMaintenance(m.id, 'down')}>
                                <ArrowDown className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <div className="flex-1 space-y-2">
                              <Input
                                value={m.task}
                                onChange={(e) => updateMaintenance(m.id, 'task', e.target.value)}
                                placeholder={t('templates.taskPlaceholder')}
                                className="text-sm"
                              />
                              <div className="flex gap-2">
                                <Select value={m.owner} onValueChange={(v) => updateMaintenance(m.id, 'owner', v)}>
                                  <SelectTrigger className="h-8 w-32 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {OWNERS.map((o) => (
                                      <SelectItem key={o} value={o}>{t(`edit.maintenance.owners.${o}`)}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Input
                                  value={m.notes}
                                  onChange={(e) => updateMaintenance(m.id, 'notes', e.target.value)}
                                  placeholder={t('templates.notesPlaceholder')}
                                  className="flex-1 text-sm"
                                />
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeMaintenance(m.id)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Coverage items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{t('templates.coverage')}</Label>
                  <Button variant="outline" size="sm" onClick={addCoverageItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('templates.addCoverageItem')}
                  </Button>
                </div>
                {editCoverage.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 rounded-lg border border-border p-3">
                    <Checkbox
                      checked={c.included}
                      onCheckedChange={(v) => updateCoverage(c.id, 'included', !!v)}
                    />
                    <Input
                      value={c.item || ''}
                      onChange={(e) => updateCoverage(c.id, 'item', e.target.value)}
                      placeholder={t('templates.coveragePlaceholder')}
                      className="flex-1 text-sm"
                    />
                    <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeCoverage(c.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Edit blocks */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{t('templates.editBlocks')}</Label>
                  <Button variant="outline" size="sm" onClick={addEditBlock}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('templates.addEditBlock')}
                  </Button>
                </div>
                {editBlocks.map((b) => (
                  <div key={b.id} className="space-y-2 rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2">
                      <Input
                        value={b.block_name || ''}
                        onChange={(e) => updateEditBlock(b.id, 'block_name', e.target.value)}
                        placeholder={t('templates.blockNamePlaceholder')}
                        className="flex-1 text-sm"
                      />
                      <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeEditBlock(b.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={b.instructions || ''}
                      onChange={(e) => updateEditBlock(b.id, 'instructions', e.target.value)}
                      placeholder={t('templates.instructionsPlaceholder')}
                      className="text-sm"
                      rows={3}
                    />
                  </div>
                ))}
              </div>

              {/* Accounts */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{t('templates.accounts')}</Label>
                  <Button variant="outline" size="sm" onClick={addAccount}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('templates.addAccount')}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{t('templates.accountsNote')}</p>
                {editAccounts.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 rounded-lg border border-border p-3">
                    <Input
                      value={a.service || ''}
                      onChange={(e) => updateAccount(a.id, 'service', e.target.value)}
                      placeholder={t('templates.servicePlaceholder')}
                      className="flex-1 text-sm"
                    />
                    <Input
                      value={a.account_owner || ''}
                      onChange={(e) => updateAccount(a.id, 'account_owner', e.target.value)}
                      placeholder={t('templates.ownerPlaceholder')}
                      className="flex-1 text-sm"
                    />
                    <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeAccount(a.id)}>
                      <X className="h-4 w-4" />
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
