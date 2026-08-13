import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth";
import {
  createCommercePromotion,
  deleteCommercePromotion,
  fetchCommercePromotions,
  updateCommercePromotion,
  uploadCommerceImage,
} from "../../lib/api";
import { buildClientAppRoute, buildPromotionDeepLink } from "../../lib/clientLinks";
import type { CommerceManagedProfile, PromotionStatus, PromotionType, ValidationMethod } from "../../types/api";
import { IconAlert, IconArrowLeft, IconCheck, IconClock, IconPlus, IconTrash } from "../../components/Icons";
import {
  buildPromotionPayload,
  buildScheduleRowsFromTemplate,
  CommerceOnboardingPanel,
  CommerceStatusNotices,
  Field,
  getPromotionWorkflowGuidance,
  LoadingBlock,
  PageHeader,
  PromotionFormState,
  SelectField,
  scheduleTemplateOptions,
  summarizePromotionSchedules,
  validatePromotionForm,
  weekdayOptions,
} from "./CommerceShared";

const promotionTypes: Array<{ value: PromotionType; label: string }> = [
  { value: "PERCENTAGE", label: "Descuento" },
  { value: "FIXED_AMOUNT", label: "Monto fijo" },
  { value: "SPECIAL_COMBO", label: "Combo" },
  { value: "BENEFIT", label: "Beneficio" },
  { value: "TIME_SLOT", label: "Franja horaria" },
  { value: "DAY_PROMO", label: "Dia promo" },
];

const validationMethods: Array<{ value: ValidationMethod; label: string }> = [
  { value: "QR", label: "QR" },
  { value: "MANUAL_CODE", label: "Codigo manual" },
];

const initialPromotionForm: PromotionFormState = {
  title: "",
  description: "",
  conditions: "",
  discountValue: "",
  maxRedemptions: "",
  startDate: "",
  endDate: "",
  startTime: "",
  endTime: "",
  imageUrl: "",
  schedules: [],
  promotionType: "PERCENTAGE",
  validationMethod: "QR",
  status: "DRAFT",
};

export function CommercePromotionEditorPage({
  commerce,
  realtimeVersion,
}: {
  commerce: CommerceManagedProfile | null;
  realtimeVersion: number;
}) {
  const { session, withSession } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const promotionId = params.promotionId ? Number(params.promotionId) : null;
  const isEdit = Number.isFinite(promotionId);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<PromotionFormState>(initialPromotionForm);
  const [currentPromotionStatus, setCurrentPromotionStatus] = useState<PromotionStatus>("DRAFT");
  const [currentModerationNote, setCurrentModerationNote] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const canOperate = commerce?.status === "APPROVED";

  useEffect(() => {
    if (!isEdit || !promotionId) return;
    setLoading(true);
    void withSession((s) => fetchCommercePromotions(s))
      .then((response) => {
        const found = response.promotions.find((promotion) => promotion.id === promotionId);
        if (!found) {
          setError("No encontramos la promocion seleccionada.");
          return;
        }
        setForm({
          title: found.title || "",
          description: found.description || "",
          conditions: found.conditions || "",
          discountValue:
            typeof found.discountValue === "number" ? String(found.discountValue) : "",
          maxRedemptions:
            typeof found.maxRedemptions === "number" ? String(found.maxRedemptions) : "",
          startDate: found.startDate ? found.startDate.slice(0, 10) : "",
          endDate: found.endDate ? found.endDate.slice(0, 10) : "",
          startTime: found.startTime || "",
          endTime: found.endTime || "",
          imageUrl: found.imageUrl || "",
          schedules: found.schedules?.map((schedule) => ({
            weekday: schedule.weekday,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
          })) || [],
          promotionType: found.promotionType,
          validationMethod: found.validationMethod,
          status: found.status || "DRAFT",
        });
        setCurrentPromotionStatus(found.status || "DRAFT");
        setCurrentModerationNote(found.moderationNote || null);
        setError(null);
      })
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : "No pudimos cargar la promo."),
      )
      .finally(() => setLoading(false));
  }, [isEdit, promotionId, realtimeVersion, withSession]);

  const workflowGuidance = getPromotionWorkflowGuidance({
    isEdit,
    currentStatus: currentPromotionStatus,
    selectedStatus: form.status,
    moderationNote: currentModerationNote,
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    if (!canOperate) {
      setError("Tu comercio todavia no esta habilitado para crear o editar promociones.");
      return;
    }
    const errors = validatePromotionForm(form);
    setValidation(errors);
    if (errors.length) return;
    try {
      setSaving(true);
      if (isEdit && promotionId) {
        const payload = buildPromotionPayload(form, { isEdit: true });
        await withSession((s) => updateCommercePromotion(s, promotionId, payload));
      } else {
        const payload = buildPromotionPayload(form, { isEdit: false });
        await withSession((s) => createCommercePromotion(s, payload));
      }
      navigate("/commerce/promotions");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No pudimos guardar la promo.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!promotionId) return;
    if (!canOperate) {
      setError("Tu comercio no esta habilitado para eliminar promociones.");
      return;
    }
    try {
      setSaving(true);
      await withSession((s) => deleteCommercePromotion(s, promotionId));
      navigate("/commerce/promotions");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No pudimos eliminar la promo.");
    } finally {
      setSaving(false);
    }
  };

  const handleImageFile = async (file: File | undefined) => {
    if (!file) return;
    if (!canOperate) {
      setError("Necesitas tener el comercio aprobado para subir imagenes de promociones.");
      return;
    }
    try {
      setUploading(true);
      setError(null);
      const uploaded = await withSession((s) => uploadCommerceImage(s, file));
      setForm((current) => ({ ...current, imageUrl: uploaded.file.url }));
      setFeedback("Imagen subida correctamente.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "No pudimos subir la imagen.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <PageHeader
        kicker={isEdit ? "/ Commerce · Edicion" : "/ Commerce · Creacion"}
        title={isEdit ? "Editar promocion" : "Nueva promocion"}
      />

      <div className="main-content">
        {commerce ? <CommerceOnboardingPanel commerce={commerce} compact /> : null}
        {commerce ? (
          <CommerceStatusNotices
            commerce={commerce}
            email={session?.user.email}
            emailVerifiedAt={session?.user.emailVerifiedAt}
          />
        ) : null}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
          <button
            className="btn btn-subtle btn-sm"
            type="button"
            onClick={() => navigate("/commerce/promotions")}
          >
            <IconArrowLeft size={13} /> Volver al listado
          </button>
          {isEdit && promotionId ? (
            <Link
              to={buildClientAppRoute({
                target: buildPromotionDeepLink(promotionId),
                title: "Abrir promo en la app",
                description: "Vista cliente de la promocion para revisar el flujo mobile.",
              })}
              className="btn btn-secondary btn-sm"
              style={{ textDecoration: "none" }}
            >
              Ver en app
            </Link>
          ) : null}
        </div>

        {loading ? (
          <LoadingBlock title="Cargando promo" text="Preparando el editor." />
        ) : (
          <section className="panel">
            <div className="panel-heading">
              <div className="panel-heading-stack">
                <h2>Configuracion de la promo</h2>
                <p>Defini beneficio, estado, horarios y vigencia.</p>
              </div>
            </div>

            {validation.length ? (
              <div className="alert alert-danger">
                <IconAlert size={14} className="alert-icon" />
                <div>
                  {validation.map((message) => (
                    <div key={message}>{message}</div>
                  ))}
                </div>
              </div>
            ) : null}
            {error ? (
              <div className="alert alert-danger">
                <IconAlert size={14} className="alert-icon" /> <span>{error}</span>
              </div>
            ) : null}
            {feedback ? (
              <div className="alert alert-success">
                <IconCheck size={14} className="alert-icon" /> <span>{feedback}</span>
              </div>
            ) : null}
            {workflowGuidance ? (
              <div className={`alert alert-${workflowGuidance.tone}`}>
                <IconClock size={14} className="alert-icon" />
                <div>
                  <strong>{workflowGuidance.title}</strong>
                  <div>{workflowGuidance.body}</div>
                  {workflowGuidance.note ? <div>{workflowGuidance.note}</div> : null}
                </div>
              </div>
            ) : null}

            <form className="form-grid" onSubmit={handleSubmit}>
              <Field
                label="Titulo"
                value={form.title}
                onChange={(value) => setForm((current) => ({ ...current, title: value }))}
              />
              <SelectField
                label="Tipo"
                value={form.promotionType}
                onChange={(value) =>
                  setForm((current) => ({ ...current, promotionType: value as PromotionType }))
                }
                options={promotionTypes}
              />
              <SelectField
                label="Validacion"
                value={form.validationMethod}
                onChange={(value) =>
                  setForm((current) => ({ ...current, validationMethod: value as ValidationMethod }))
                }
                options={validationMethods}
              />
              <Field
                label="Descripcion"
                multiline
                value={form.description}
                onChange={(value) => setForm((current) => ({ ...current, description: value }))}
                className="field-wide"
              />
              <Field
                label="Condiciones"
                multiline
                value={form.conditions}
                onChange={(value) => setForm((current) => ({ ...current, conditions: value }))}
                className="field-wide"
              />
              <Field
                label="Valor descuento (%)"
                value={form.discountValue}
                inputMode="decimal"
                onChange={(value) => setForm((current) => ({ ...current, discountValue: value }))}
              />
              <Field
                label="Cupo maximo de canjes"
                value={form.maxRedemptions}
                inputMode="numeric"
                onChange={(value) => setForm((current) => ({ ...current, maxRedemptions: value }))}
              />
              <div className="field field-wide">
                <span className="field-help">
                  Si la promo depende de una franja horaria o de un dia puntual, completa inicio y fin juntos para que la app muestre la ventana exacta de canje.
                </span>
              </div>
              <SelectField
                label="Estado"
                value={form.status}
                onChange={(value) =>
                  setForm((current) => ({ ...current, status: value as PromotionStatus }))
                }
                options={[
                  { value: "DRAFT", label: "Borrador" },
                  { value: "PENDING_REVIEW", label: "Enviar a revision" },
                ]}
              />
              <Field
                label="Fecha inicio"
                type="date"
                value={form.startDate}
                onChange={(value) => setForm((current) => ({ ...current, startDate: value }))}
              />
              <Field
                label="Fecha fin"
                type="date"
                value={form.endDate}
                onChange={(value) => setForm((current) => ({ ...current, endDate: value }))}
              />
              <Field
                label="Hora inicio"
                type="time"
                value={form.startTime}
                onChange={(value) => setForm((current) => ({ ...current, startTime: value }))}
              />
              <Field
                label="Hora fin"
                type="time"
                value={form.endTime}
                onChange={(value) => setForm((current) => ({ ...current, endTime: value }))}
              />
              <div className="field field-wide">
                <label className="field-label">Ventanas por dia (opcional)</label>
                <div className="field-help" style={{ marginBottom: 8 }}>
                  Si agregas franjas por dia, PROMY usara esas ventanas como regla principal de disponibilidad.
                </div>
                {form.schedules.length ? (
                  <div className="field-help" style={{ marginBottom: 10 }}>
                    Resumen: {summarizePromotionSchedules(form.schedules) || "Sin franjas completas todavia."}
                  </div>
                ) : null}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  {scheduleTemplateOptions.map((template) => (
                    <button
                      key={template.id}
                      className="btn btn-subtle btn-sm"
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          schedules: [...current.schedules, ...buildScheduleRowsFromTemplate(template)],
                        }))
                      }
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {form.schedules.map((schedule, index) => (
                    <div
                      key={`${schedule.weekday}-${index}`}
                      style={{ display: "grid", gap: 10, gridTemplateColumns: "1.3fr 1fr 1fr auto" }}
                    >
                      <select
                        className="field-select"
                        value={schedule.weekday}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            schedules: current.schedules.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, weekday: event.target.value as typeof item.weekday }
                                : item,
                            ),
                          }))
                        }
                      >
                        {weekdayOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <input
                        className="field-input"
                        type="time"
                        value={schedule.startTime}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            schedules: current.schedules.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, startTime: event.target.value } : item,
                            ),
                          }))
                        }
                      />
                      <input
                        className="field-input"
                        type="time"
                        value={schedule.endTime}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            schedules: current.schedules.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, endTime: event.target.value } : item,
                            ),
                          }))
                        }
                      />
                      <button
                        className="btn btn-ghost"
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            schedules: current.schedules.filter((_, itemIndex) => itemIndex !== index),
                          }))
                        }
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10 }}>
                  <button
                    className="btn btn-subtle btn-sm"
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        schedules: [
                          ...current.schedules,
                          { weekday: "MONDAY", startTime: "09:00", endTime: "18:00" },
                        ],
                      }))
                    }
                  >
                    <IconPlus size={13} /> Agregar franja
                  </button>
                </div>
              </div>
              <Field
                label="Imagen (URL)"
                value={form.imageUrl}
                onChange={(value) => setForm((current) => ({ ...current, imageUrl: value }))}
                className="field-wide"
              />

              <div className="field field-wide">
                <label className="field-label">Subir imagen al servidor</label>
                <input
                  type="file"
                  accept="image/*"
                  className="file-input"
                  disabled={!canOperate}
                  onChange={(event) => handleImageFile(event.target.files?.[0])}
                />
                <span className="field-help">
                  {uploading
                    ? "Subiendo imagen..."
                    : "Tambien podes subir una imagen directamente (JPG / PNG)."}
                </span>
              </div>

              {form.imageUrl ? (
                <div className="field-wide">
                  <div className="image-preview">
                    <img alt="Vista previa" src={form.imageUrl} />
                  </div>
                </div>
              ) : null}

              <div className="form-footer field-wide">
                {isEdit ? (
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={saving || !canOperate}
                  >
                    <IconTrash size={13} /> Eliminar
                  </button>
                ) : (
                  <span className="meta">Podes editar despues de crear.</span>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => navigate("/commerce/promotions")}
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={saving || !canOperate}
                  >
                    {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear promocion"}
                  </button>
                </div>
              </div>
            </form>
          </section>
        )}
      </div>

      {showDeleteConfirm ? (
        <div
          className="modal-backdrop"
          onClick={() => !saving && setShowDeleteConfirm(false)}
          role="presentation"
        >
          <div
            className="modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="page-kicker">Accion sensible</div>
            <h2>Eliminar promocion</h2>
            <p className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>
              Vas a borrar esta promocion de forma permanente si todavia no tiene canjes asociados.
              Si necesitas frenarla sin perder historial, conviene dejarla en borrador o volver a
              revision.
            </p>

            <div className="modal-footer">
              <button
                className="btn btn-ghost"
                type="button"
                disabled={saving}
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancelar
              </button>
              <button className="btn btn-primary" type="button" disabled={saving} onClick={handleDelete}>
                {saving ? "Eliminando..." : "Si, eliminar promo"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
