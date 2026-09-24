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
import type { CommerceManagedProfile, PromotionStatus, PromotionType } from "../../types/api";
import {
  IconAlert,
  IconArrowLeft,
  IconCheck,
  IconImage,
  IconPlus,
  IconTrash,
} from "../../components/Icons";
import {
  buildPromotionPayload,
  buildScheduleRowsFromTemplate,
  getCommerceBlockedActionLabel,
  LoadingBlock,
  PromotionFormState,
  scheduleTemplateOptions,
  validatePromotionForm,
  weekdayOptions,
} from "./CommerceShared";
import { getOwnerEditablePromotionStatus } from "./commerceRules";

const promotionTypes: Array<{ value: PromotionType; label: string }> = [
  { value: "PERCENTAGE", label: "% de descuento" },
  { value: "FIXED_AMOUNT", label: "$ de descuento" },
  { value: "SPECIAL_COMBO", label: "Combo / 2x1" },
  { value: "BENEFIT", label: "Otro beneficio" },
  { value: "TIME_SLOT", label: "Promo por horario" },
  { value: "DAY_PROMO", label: "Promo por día" },
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
  const { withSession } = useAuth();
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
  const [showConditions, setShowConditions] = useState(false);
  const [limitRedemptions, setLimitRedemptions] = useState(false);
  const [limitHours, setLimitHours] = useState(false);
  const [useDaySchedules, setUseDaySchedules] = useState(false);
  const canOperate = commerce?.status === "APPROVED";

  useEffect(() => {
    if (!isEdit || !promotionId) return;
    setLoading(true);
    void withSession((s) => fetchCommercePromotions(s))
      .then((response) => {
        const found = response.promotions.find((promotion) => promotion.id === promotionId);
        if (!found) {
          setError("No encontramos la promoción seleccionada.");
          return;
        }

        const nextForm: PromotionFormState = {
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
          schedules:
            found.schedules?.map((schedule) => ({
              weekday: schedule.weekday,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
            })) || [],
          promotionType: found.promotionType,
          validationMethod: found.validationMethod,
          status: getOwnerEditablePromotionStatus(found.status || "DRAFT"),
        };

        setForm(nextForm);
        setCurrentPromotionStatus(found.status || "DRAFT");
        setCurrentModerationNote(found.moderationNote || null);
        setShowConditions(Boolean(nextForm.conditions.trim()));
        setLimitRedemptions(Boolean(nextForm.maxRedemptions.trim()));
        setLimitHours(
          Boolean(nextForm.startTime || nextForm.endTime || nextForm.schedules.length),
        );
        setUseDaySchedules(nextForm.schedules.length > 0);
        setError(null);
      })
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : "No pudimos cargar la promo."),
      )
      .finally(() => setLoading(false));
  }, [isEdit, promotionId, realtimeVersion, withSession]);

  const savePromotion = async (targetStatus: "DRAFT" | "PENDING_REVIEW") => {
    setFeedback(null);
    setError(null);

    if (!canOperate) {
      setError("Tu comercio todavía no está habilitado para crear o editar promociones.");
      return;
    }

    const formToSave: PromotionFormState = {
      ...form,
      status: targetStatus,
      conditions: showConditions ? form.conditions : "",
      maxRedemptions: limitRedemptions ? form.maxRedemptions : "",
      startTime: limitHours && !useDaySchedules ? form.startTime : "",
      endTime: limitHours && !useDaySchedules ? form.endTime : "",
      schedules: limitHours && useDaySchedules ? form.schedules : [],
    };

    const errors = validatePromotionForm(formToSave);
    setValidation(errors);
    if (errors.length) return;

    try {
      setSaving(true);
      if (isEdit && promotionId) {
        const payload = buildPromotionPayload(formToSave, { isEdit: true });
        await withSession((s) => updateCommercePromotion(s, promotionId, payload));
      } else {
        const payload = buildPromotionPayload(formToSave, { isEdit: false });
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
      setError("Tu comercio no está habilitado para eliminar promociones.");
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
      setError("Necesitás tener el comercio aprobado para subir imágenes de promociones.");
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

  const discountLabel = form.promotionType === "FIXED_AMOUNT" ? "Monto del descuento" : "Descuento";
  const discountSuffix = form.promotionType === "FIXED_AMOUNT" ? "$" : "%";
  const showDiscountValue =
    form.promotionType === "PERCENTAGE" || form.promotionType === "FIXED_AMOUNT";

  const editNeedsReview =
    isEdit &&
    (currentPromotionStatus === "APPROVED_VISIBLE" ||
      currentPromotionStatus === "REJECTED" ||
      currentPromotionStatus === "EXPIRED");

  return (
    <>
      <header className="commerce-promo-editor-header">
        <div className="commerce-promo-editor-header-inner">
          <div>
            <div className="commerce-simple-eyebrow">Promociones</div>
            <h1>{isEdit ? "Editar promoción" : "Nueva promoción"}</h1>
            <p>
              {isEdit
                ? "Actualizá lo necesario sin perder de vista lo importante."
                : "Creala en pocos pasos. Podés guardarla antes de enviarla a revisión."}
            </p>
          </div>
          <button
            className="commerce-promo-editor-back"
            type="button"
            onClick={() => navigate("/commerce/promotions")}
          >
            <IconArrowLeft size={14} /> Volver
          </button>
        </div>
      </header>

      <main className="main-content commerce-promo-editor-content">
        {!canOperate && commerce ? (
          <section className="commerce-promo-editor-blocked">
            <IconAlert size={17} />
            <div>
              <strong>Todavía no podés gestionar promociones.</strong>
              <span>{getCommerceBlockedActionLabel(commerce.status)}</span>
            </div>
            <Link to="/commerce/profile">Ver mi negocio</Link>
          </section>
        ) : null}

        {loading ? (
          <LoadingBlock title="Cargando promoción" text="Un momento." />
        ) : (
          <form
            className="commerce-promo-editor-form"
            onSubmit={(event) => {
              event.preventDefault();
              void savePromotion("PENDING_REVIEW");
            }}
          >
            {validation.length ? (
              <div className="alert alert-danger" role="alert">
                <IconAlert size={14} className="alert-icon" />
                <div>
                  {validation.map((message) => (
                    <div key={message}>{message}</div>
                  ))}
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="alert alert-danger" role="alert">
                <IconAlert size={14} className="alert-icon" /> <span>{error}</span>
              </div>
            ) : null}

            {feedback ? (
              <div className="alert alert-success" role="status" aria-live="polite">
                <IconCheck size={14} className="alert-icon" /> <span>{feedback}</span>
              </div>
            ) : null}

            {editNeedsReview ? (
              <div className="commerce-promo-editor-review-note">
                <strong>Al guardar cambios, la promoción vuelve a revisión.</strong>
                <span>
                  {currentModerationNote
                    ? `Observación actual: ${currentModerationNote}`
                    : "PROMY la revisará antes de volver a mostrarla a clientes."}
                </span>
              </div>
            ) : null}

            <section className="commerce-promo-editor-section">
              <div className="commerce-promo-editor-section-head">
                <span>1</span>
                <div>
                  <h2>¿Qué vas a ofrecer?</h2>
                  <p>Lo esencial que verá el cliente.</p>
                </div>
              </div>

              <div
                className={`commerce-promo-editor-grid commerce-promo-editor-offer-grid${
                  showDiscountValue ? "" : " without-discount"
                }`}
              >
                <label className="field commerce-promo-editor-title-field">
                  <span className="field-label">Título</span>
                  <input
                    className="field-input"
                    value={form.title}
                    placeholder="Ej. Primer mes con 35% OFF"
                    onChange={(event) =>
                      setForm((current) => ({ ...current, title: event.target.value }))
                    }
                  />
                </label>

                <label className="field">
                  <span className="field-label">Beneficio</span>
                  <select
                    className="field-select"
                    value={form.promotionType}
                    onChange={(event) => {
                      const promotionType = event.target.value as PromotionType;
                      setForm((current) => ({
                        ...current,
                        promotionType,
                        discountValue:
                          promotionType === "PERCENTAGE" || promotionType === "FIXED_AMOUNT"
                            ? current.discountValue
                            : "",
                      }));
                    }}
                  >
                    {promotionTypes.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                {showDiscountValue ? (
                  <label className="field commerce-promo-editor-discount-field">
                    <span className="field-label">{discountLabel}</span>
                    <div className="commerce-promo-editor-value-input">
                      <input
                        className="field-input"
                        inputMode="decimal"
                        value={form.discountValue}
                        placeholder={form.promotionType === "FIXED_AMOUNT" ? "5000" : "35"}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, discountValue: event.target.value }))
                        }
                      />
                      <span>{discountSuffix}</span>
                    </div>
                  </label>
                ) : null}

                <label className="field commerce-promo-editor-description">
                  <span className="field-label">Descripción</span>
                  <textarea
                    className="field-textarea"
                    value={form.description}
                    placeholder="Contale al cliente de qué se trata la promoción."
                    onChange={(event) =>
                      setForm((current) => ({ ...current, description: event.target.value }))
                    }
                  />
                </label>
              </div>

              <div className="commerce-promo-editor-optional-row">
                <button
                  className="commerce-promo-editor-inline-toggle"
                  type="button"
                  aria-expanded={showConditions}
                  onClick={() => {
                    setShowConditions((current) => !current);
                    if (showConditions) {
                      setForm((current) => ({ ...current, conditions: "" }));
                    }
                  }}
                >
                  <IconPlus size={13} />
                  {showConditions ? "Quitar condiciones" : "Agregar condiciones"}
                  <span>opcional</span>
                </button>
              </div>

              {showConditions ? (
                <label className="field commerce-promo-editor-reveal">
                  <span className="field-label">Condiciones</span>
                  <textarea
                    className="field-textarea commerce-promo-editor-conditions"
                    value={form.conditions}
                    placeholder="Ej. Válido presentando DNI. No acumulable con otras promociones."
                    onChange={(event) =>
                      setForm((current) => ({ ...current, conditions: event.target.value }))
                    }
                  />
                </label>
              ) : null}
            </section>

            <section className="commerce-promo-editor-section">
              <div className="commerce-promo-editor-section-head">
                <span>2</span>
                <div>
                  <h2>¿Cuándo se puede usar?</h2>
                  <p>Definí la vigencia y agregá límites sólo si hacen falta.</p>
                </div>
              </div>

              <div className="commerce-promo-editor-grid commerce-promo-editor-dates">
                <label className="field">
                  <span className="field-label">Desde</span>
                  <input
                    className="field-input"
                    type="date"
                    value={form.startDate}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, startDate: event.target.value }))
                    }
                  />
                </label>
                <label className="field">
                  <span className="field-label">Hasta</span>
                  <input
                    className="field-input"
                    type="date"
                    value={form.endDate}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, endDate: event.target.value }))
                    }
                  />
                </label>
              </div>

              <div className="commerce-promo-editor-options">
                <label className="commerce-promo-editor-option">
                  <input
                    type="checkbox"
                    checked={limitHours}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setLimitHours(checked);
                      if (!checked) {
                        setUseDaySchedules(false);
                        setForm((current) => ({
                          ...current,
                          startTime: "",
                          endTime: "",
                          schedules: [],
                        }));
                      }
                    }}
                  />
                  <span>
                    <strong>Limitar horarios</strong>
                    <small>Si la promoción funciona sólo en determinados horarios.</small>
                  </span>
                </label>

                <label className="commerce-promo-editor-option">
                  <input
                    type="checkbox"
                    checked={limitRedemptions}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setLimitRedemptions(checked);
                      if (!checked) {
                        setForm((current) => ({ ...current, maxRedemptions: "" }));
                      }
                    }}
                  />
                  <span>
                    <strong>Limitar cantidad de canjes</strong>
                    <small>Útil si querés ofrecer un cupo limitado.</small>
                  </span>
                </label>
              </div>

              {limitRedemptions ? (
                <label className="field commerce-promo-editor-small-reveal">
                  <span className="field-label">Máximo de canjes</span>
                  <input
                    className="field-input"
                    inputMode="numeric"
                    value={form.maxRedemptions}
                    placeholder="Ej. 100"
                    onChange={(event) =>
                      setForm((current) => ({ ...current, maxRedemptions: event.target.value }))
                    }
                  />
                </label>
              ) : null}

              {limitHours ? (
                <div className="commerce-promo-editor-hours commerce-promo-editor-reveal">
                  <div className="commerce-promo-editor-hours-mode">
                    <button
                      type="button"
                      className={!useDaySchedules ? "is-active" : ""}
                      onClick={() => {
                        setUseDaySchedules(false);
                        setForm((current) => ({ ...current, schedules: [] }));
                      }}
                    >
                      Mismo horario todos los días
                    </button>
                    <button
                      type="button"
                      className={useDaySchedules ? "is-active" : ""}
                      onClick={() => {
                        setUseDaySchedules(true);
                        setForm((current) => ({ ...current, startTime: "", endTime: "" }));
                      }}
                    >
                      Horarios según el día
                    </button>
                  </div>

                  {!useDaySchedules ? (
                    <div className="commerce-promo-editor-grid commerce-promo-editor-time-grid">
                      <label className="field">
                        <span className="field-label">Desde las</span>
                        <input
                          className="field-input"
                          type="time"
                          value={form.startTime}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, startTime: event.target.value }))
                          }
                        />
                      </label>
                      <label className="field">
                        <span className="field-label">Hasta las</span>
                        <input
                          className="field-input"
                          type="time"
                          value={form.endTime}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, endTime: event.target.value }))
                          }
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="commerce-promo-editor-schedules">
                      <div className="commerce-promo-editor-schedule-presets">
                        {scheduleTemplateOptions.map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() =>
                              setForm((current) => ({
                                ...current,
                                schedules: [
                                  ...current.schedules,
                                  ...buildScheduleRowsFromTemplate(template),
                                ],
                              }))
                            }
                          >
                            {template.label}
                          </button>
                        ))}
                      </div>

                      {form.schedules.map((schedule, index) => (
                        <div className="commerce-promo-editor-schedule-row" key={`${schedule.weekday}-${index}`}>
                          <select
                            aria-label={`Día de la franja ${index + 1}`}
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
                            aria-label={`Hora de inicio de la franja ${index + 1}`}
                            className="field-input"
                            type="time"
                            value={schedule.startTime}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                schedules: current.schedules.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, startTime: event.target.value }
                                    : item,
                                ),
                              }))
                            }
                          />
                          <input
                            aria-label={`Hora de fin de la franja ${index + 1}`}
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

                      <button
                        className="commerce-promo-editor-add-schedule"
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
                        <IconPlus size={13} /> Agregar horario
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </section>

            <section className="commerce-promo-editor-section commerce-promo-editor-section-last">
              <div className="commerce-promo-editor-section-head">
                <span>3</span>
                <div>
                  <h2>Imagen</h2>
                  <p>Es opcional, pero ayuda a que la promoción se vea mejor.</p>
                </div>
              </div>

              <div className={`commerce-promo-editor-image-box${form.imageUrl ? " has-image" : ""}`}>
                {form.imageUrl ? (
                  <div className="commerce-promo-editor-image-preview">
                    <img src={form.imageUrl} alt="Vista previa de la promoción" />
                  </div>
                ) : (
                  <div className="commerce-promo-editor-image-empty">
                    <IconImage size={24} />
                    <strong>Subí una imagen</strong>
                    <span>JPG o PNG</span>
                  </div>
                )}

                <div className="commerce-promo-editor-image-actions">
                  <label className="btn btn-secondary btn-sm" htmlFor="promotion-image-upload">
                    {uploading ? "Subiendo..." : form.imageUrl ? "Cambiar imagen" : "Seleccionar imagen"}
                  </label>
                  <input
                    id="promotion-image-upload"
                    name="promotionImage"
                    type="file"
                    accept="image/*"
                    disabled={!canOperate || uploading}
                    onChange={(event) => handleImageFile(event.target.files?.[0])}
                  />
                  {form.imageUrl ? (
                    <button
                      type="button"
                      className="commerce-promo-editor-remove-image"
                      onClick={() => setForm((current) => ({ ...current, imageUrl: "" }))}
                    >
                      Quitar
                    </button>
                  ) : null}
                </div>
              </div>
            </section>

            <footer className="commerce-promo-editor-footer">
              {isEdit ? (
                <div className="commerce-promo-editor-footer-left">
                  <button
                    className="commerce-promo-editor-delete"
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={saving || !canOperate}
                  >
                    <IconTrash size={13} /> Eliminar
                  </button>
                  <Link
                    to={`/commerce/promotions/${promotionId as number}/preview`}
                    className="commerce-promo-editor-client-link"
                  >
                    Ver como cliente
                  </Link>
                </div>
              ) : null}

              <div className="commerce-promo-editor-footer-actions">
                <button
                  className="btn btn-secondary"
                  type="button"
                  disabled={saving || !canOperate}
                  onClick={() => void savePromotion("DRAFT")}
                >
                  {saving ? "Guardando..." : "Guardar borrador"}
                </button>
                <button className="btn btn-primary" type="submit" disabled={saving || !canOperate}>
                  {saving
                    ? "Guardando..."
                    : isEdit
                    ? "Guardar y enviar a revisión"
                    : "Enviar a revisión"}
                </button>
              </div>
            </footer>
          </form>
        )}
      </main>

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
            <div className="page-kicker">Acción sensible</div>
            <h2>Eliminar promoción</h2>
            <p className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>
              Vas a borrar esta promoción de forma permanente si todavía no tiene canjes asociados.
              Si necesitás frenarla sin perder historial, conviene dejarla en borrador.
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
                {saving ? "Eliminando..." : "Sí, eliminar promo"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
