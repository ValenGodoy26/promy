import React from "react";

export type AdminCommerceDraft = {
  name: string;
  shortDescription: string;
  address: string;
  phone: string;
  instagram: string;
  logoUrl: string;
  coverUrl: string;
  latitude: string;
  longitude: string;
  isFeatured: boolean;
  featuredRank: string;
  isHiddenByAdmin: boolean;
  adminNote: string;
};

type AdminCommerceControlPanelProps = {
  draft: AdminCommerceDraft;
  saving: boolean;
  onDraftChange: (updater: (current: AdminCommerceDraft) => AdminCommerceDraft) => void;
  onSave: () => void;
};

export function AdminCommerceControlPanel({
  draft,
  saving,
  onDraftChange,
  onSave,
}: AdminCommerceControlPanelProps) {
  return (
    <section className="admin-editor-panel">
      <div className="page-kicker">Control admin</div>
      <h3>Ficha visible en app</h3>
      <p>
        Estos cambios impactan el catalogo mobile, el mapa y la landing de comercios cuando la API
        vuelve a consultar datos.
      </p>

      <div className="form-grid">
        <div className="field field-wide">
          <label className="field-label" htmlFor="admin-commerce-name">Nombre público</label>
          <input
            id="admin-commerce-name"
            name="name"
            className="field-input"
            value={draft.name}
            onChange={(event) => onDraftChange((current) => ({ ...current, name: event.target.value }))}
          />
        </div>
        <div className="field field-wide">
          <label className="field-label" htmlFor="admin-commerce-description">Descripción corta</label>
          <textarea
            id="admin-commerce-description"
            name="shortDescription"
            className="field-textarea"
            value={draft.shortDescription}
            onChange={(event) =>
              onDraftChange((current) => ({ ...current, shortDescription: event.target.value }))
            }
          />
        </div>
        <div className="field field-wide">
          <label className="field-label" htmlFor="admin-commerce-address">Dirección</label>
          <input
            id="admin-commerce-address"
            name="address"
            className="field-input"
            value={draft.address}
            onChange={(event) => onDraftChange((current) => ({ ...current, address: event.target.value }))}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="admin-commerce-latitude">Latitud</label>
          <input
            id="admin-commerce-latitude"
            name="latitude"
            className="field-input"
            value={draft.latitude}
            onChange={(event) => onDraftChange((current) => ({ ...current, latitude: event.target.value }))}
            placeholder="-31.39"
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="admin-commerce-longitude">Longitud</label>
          <input
            id="admin-commerce-longitude"
            name="longitude"
            className="field-input"
            value={draft.longitude}
            onChange={(event) => onDraftChange((current) => ({ ...current, longitude: event.target.value }))}
            placeholder="-58.02"
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="admin-commerce-phone">Teléfono</label>
          <input
            id="admin-commerce-phone"
            name="phone"
            className="field-input"
            value={draft.phone}
            onChange={(event) => onDraftChange((current) => ({ ...current, phone: event.target.value }))}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="admin-commerce-instagram">Instagram</label>
          <input
            id="admin-commerce-instagram"
            name="instagram"
            className="field-input"
            value={draft.instagram}
            onChange={(event) => onDraftChange((current) => ({ ...current, instagram: event.target.value }))}
          />
        </div>
        <div className="field field-wide">
          <label className="field-label" htmlFor="admin-commerce-logo">Logo URL</label>
          <input
            id="admin-commerce-logo"
            name="logoUrl"
            className="field-input"
            value={draft.logoUrl}
            onChange={(event) => onDraftChange((current) => ({ ...current, logoUrl: event.target.value }))}
          />
        </div>
        <div className="field field-wide">
          <label className="field-label" htmlFor="admin-commerce-cover">Cover URL</label>
          <input
            id="admin-commerce-cover"
            name="coverUrl"
            className="field-input"
            value={draft.coverUrl}
            onChange={(event) => onDraftChange((current) => ({ ...current, coverUrl: event.target.value }))}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="admin-commerce-rank">Orden destacado</label>
          <input
            id="admin-commerce-rank"
            name="featuredRank"
            className="field-input"
            inputMode="numeric"
            value={draft.featuredRank}
            onChange={(event) =>
              onDraftChange((current) => ({ ...current, featuredRank: event.target.value }))
            }
          />
        </div>
        <div className="field field-wide">
          <label className="field-label" htmlFor="admin-commerce-note">Nota interna</label>
          <textarea
            id="admin-commerce-note"
            name="adminNote"
            className="field-textarea"
            value={draft.adminNote}
            onChange={(event) => onDraftChange((current) => ({ ...current, adminNote: event.target.value }))}
          />
        </div>
      </div>

      <div className="admin-control-switches">
        <button
          type="button"
          aria-pressed={draft.isFeatured}
          className={draft.isFeatured ? "chip is-active" : "chip"}
          onClick={() => onDraftChange((current) => ({ ...current, isFeatured: !current.isFeatured }))}
        >
          Destacado
        </button>
        <button
          type="button"
          aria-pressed={draft.isHiddenByAdmin}
          className={draft.isHiddenByAdmin ? "chip is-active" : "chip"}
          onClick={() =>
            onDraftChange((current) => ({ ...current, isHiddenByAdmin: !current.isHiddenByAdmin }))
          }
        >
          Oculto en app
        </button>
      </div>

      <button className="btn btn-primary" type="button" disabled={saving} onClick={onSave}>
        {saving ? "Guardando..." : "Guardar control de comercio"}
      </button>
    </section>
  );
}
