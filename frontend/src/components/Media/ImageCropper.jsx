// frontend/src/components/Media/ImageCropper.jsx

import { useState, useRef } from "react";
import {
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  Move,
  Trash2,
  Plus,
} from "lucide-react";
import "./ImageCropper.css";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export default function ImageCropper({
  value,
  onChange,
  multiple = true,
  label = "صور المنتج",
  helperText,
}) {
  const images = Array.isArray(value) ? value : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragState, setDragState] = useState({
    dragging: false,
    lastX: 0,
    lastY: 0,
  });

  const fileInputRef = useRef(null);

  const activeImage = images[activeIndex] || null;

  const handleFilesSelect = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const newItems = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
    }));

    const nextImages = multiple ? [...images, ...newItems] : [newItems[0]];
    onChange(nextImages);
    if (!multiple) {
      setActiveIndex(0);
    } else {
      if (images.length === 0) {
        setActiveIndex(0);
      }
    }
  };

  const handleChangeTransform = (index, patch) => {
    const next = images.map((img, i) =>
      i === index ? { ...img, ...patch } : img
    );
    onChange(next);
  };

  const handleZoomChange = (event) => {
    if (!activeImage) return;
    const zoom = parseFloat(event.target.value || "1");
    handleChangeTransform(activeIndex, {
      zoom: clamp(zoom, 1, 3),
    });
  };

  const handleZoomStep = (delta) => {
    if (!activeImage) return;
    const nextZoom = clamp((activeImage.zoom || 1) + delta, 1, 3);
    handleChangeTransform(activeIndex, { zoom: nextZoom });
  };

  const handleResetTransform = () => {
    if (!activeImage) return;
    handleChangeTransform(activeIndex, {
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
    });
  };

  const handleRemoveImage = (index) => {
    const next = images.filter((_, i) => i !== index);
    onChange(next);
    if (index === activeIndex) {
      setActiveIndex(0);
    } else if (index < activeIndex) {
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    }
  };

  const handleMouseDown = (event) => {
    if (!activeImage) return;
    event.preventDefault();
    setDragState({
      dragging: true,
      lastX: event.clientX,
      lastY: event.clientY,
    });
  };

  const handleMouseMove = (event) => {
    if (!activeImage || !dragState.dragging) return;

    const dx = event.clientX - dragState.lastX;
    const dy = event.clientY - dragState.lastY;

    setDragState({
      dragging: true,
      lastX: event.clientX,
      lastY: event.clientY,
    });

    // نفترض حجم الإطار ~ 220px لتحويل الحركة إلى نسب مئوية
    const frameSize = 220;
    const deltaXPercent = (dx / frameSize) * 100;
    const deltaYPercent = (dy / frameSize) * 100;

    const nextOffsetX = clamp(
      (activeImage.offsetX || 0) + deltaXPercent,
      -60,
      60
    );
    const nextOffsetY = clamp(
      (activeImage.offsetY || 0) + deltaYPercent,
      -60,
      60
    );

    handleChangeTransform(activeIndex, {
      offsetX: nextOffsetX,
      offsetY: nextOffsetY,
    });
  };

  const handleMouseUp = () => {
    if (!dragState.dragging) return;
    setDragState((prev) => ({ ...prev, dragging: false }));
  };

  return (
    <div className="image-cropper">
      {label && <label className="image-cropper-label">{label}</label>}

      <div className="image-cropper-main">
        {/* إطار المعاينة */}
        <div
          className={`image-cropper-frame ${
            dragState.dragging ? "is-dragging" : ""
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {activeImage ? (
            <img
              src={activeImage.url}
              alt="preview"
              draggable={false}
              style={{
                transform: `translate(${activeImage.offsetX || 0}%, ${
                  activeImage.offsetY || 0
                }%) scale(${activeImage.zoom || 1})`,
              }}
            />
          ) : (
            <div className="image-cropper-empty">
              <ImageIcon size={24} />
              <p>لم تقم برفع صورة بعد</p>
            </div>
          )}
        </div>

        {/* أدوات التحكم */}
        <div className="image-cropper-controls">
          <div className="image-cropper-upload">
            <button
              type="button"
              className="image-cropper-upload-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus size={14} />
              <span>{multiple ? "إضافة صور" : "اختيار صورة"}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple={multiple}
              onChange={handleFilesSelect}
              style={{ display: "none" }}
            />
            {helperText && (
              <p className="image-cropper-helper">{helperText}</p>
            )}
          </div>

          {activeImage && (
            <div className="image-cropper-sliders">
              <div className="image-cropper-slider-row">
                <div className="image-cropper-slider-label">
                  <ZoomOut size={14} />
                  <span>التكبير</span>
                  <ZoomIn size={14} />
                </div>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={activeImage.zoom || 1}
                  onChange={handleZoomChange}
                />
              </div>

              <div className="image-cropper-actions-row">
                <div className="image-cropper-actions-left">
                  <button
                    type="button"
                    className="image-cropper-mini-btn"
                    onClick={handleResetTransform}
                  >
                    <Move size={14} />
                    <span>إعادة التوسيط</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* شريط الصور المصغّرة */}
      {images.length > 0 && (
        <div className="image-cropper-thumbs">
          {images.map((img, index) => (
            <button
              key={index}
              type="button"
              className={`image-cropper-thumb ${
                index === activeIndex ? "is-active" : ""
              }`}
              onClick={() => setActiveIndex(index)}
            >
              <div className="image-cropper-thumb-inner">
                <img src={img.url} alt={`thumb-${index}`} />
              </div>
              <div className="image-cropper-thumb-actions">
                <button
                  type="button"
                  className="image-cropper-delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage(index);
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
