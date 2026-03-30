// frontend/src/components/Media/ImageCropper.jsx

import { useState, useRef, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop";
import {
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  Trash2,
  Plus,
  Check,
  X,
  Crop as CropIcon,
} from "lucide-react";
import getCroppedImg from "@/lib/canvasUtils";
import "./ImageCropper.css";

// Aspect Ratio 4:5 (0.8) unified across the store
const ASPECT_RATIO = 4 / 5;

export default function ImageCropper({
  value,
  onChange,
  multiple = true,
  label = "صور المنتج",
  helperText,
}) {
  const images = Array.isArray(value) ? value : [];

  // Active Image State
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = images[activeIndex] || null;

  // Cropping State
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropping, setIsCropping] = useState(false);

  const fileInputRef = useRef(null);

  // Reset crop state when changing active image
  useEffect(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setIsCropping(false);
  }, [activeIndex]);

  const handleFilesSelect = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const newItems = files.map((file) => ({
      file,
      url: URL.createObjectURL(file), // Preview URL
      isNew: true,
    }));

    const nextImages = multiple ? [...images, ...newItems] : [newItems[0]];
    onChange(nextImages);

    // Select the first new image to crop immediately if it's the only one
    if (!multiple || images.length === 0) {
      setActiveIndex(images.length); // Index of the first new item
      setIsCropping(true);
    }
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSaveCrop = async () => {
    if (!activeImage || !croppedAreaPixels) return;

    try {
      const croppedBlob = await getCroppedImg(
        activeImage.url, // Ensure we use the original URL/Blob
        croppedAreaPixels
      );

      // Create a new URL for the cropped blob
      const croppedUrl = URL.createObjectURL(croppedBlob);

      // Update the image item in the list
      const nextImages = [...images];
      nextImages[activeIndex] = {
        ...activeImage,
        file: croppedBlob, // Replace file with cropped blob
        url: croppedUrl,   // Update preview URL
        isCropped: true,
      };

      onChange(nextImages);
      setIsCropping(false);
    } catch (e) {
      console.error("Failed to crop image", e);
    }
  };

  const handleRemoveImage = (index, e) => {
    e.stopPropagation();
    const next = images.filter((_, i) => i !== index);
    onChange(next);
    if (index === activeIndex) {
      setActiveIndex(0);
    } else if (index < activeIndex) {
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    }
  };

  // Live Preview Generator (Optional: could add a real-time separate preview canvas if needed)
  // But react-easy-crop shows the crop area clearly. 
  // We will instead show the "Result Preview" vs "Original" when not cropping.

  return (
    <div className="image-cropper">
      {/* Header */}
      <div className="image-cropper-header">
        {label && <label className="image-cropper-label">{label}</label>}
        <button
          type="button"
          className="image-cropper-add-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          <Plus size={16} />
          <span>{multiple ? "إضافة صور" : "تغيير الصورة"}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={handleFilesSelect}
          style={{ display: "none" }}
        />
      </div>

      {helperText && <p className="image-cropper-helper">{helperText}</p>}

      {/* Main Workspace */}
      <div className="image-cropper-workspace">
        {/* Thumbnails List */}
        {images.length > 0 && (
          <div className="image-cropper-thumbs">
            {images.map((img, index) => (
              <div
                key={index}
                className={`image-cropper-thumb ${index === activeIndex ? "is-active" : ""
                  }`}
                onClick={() => setActiveIndex(index)}
              >
                <img src={img.url} alt={`thumb-${index}`} />
                {img.isCropped && (
                  <div className="thumb-badge">
                    <Check size={10} />
                  </div>
                )}
                <button
                  type="button"
                  className="thumb-remove"
                  onClick={(e) => handleRemoveImage(index, e)}
                  aria-label="Remove image"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Active Image Editor / Preview */}
        {activeImage ? (
          <div className="image-editor-container">
            {isCropping ? (
              <div className="cropper-wrapper">
                <div className="cropper-area">
                  <Cropper
                    image={activeImage.url}
                    crop={crop}
                    zoom={zoom}
                    aspect={ASPECT_RATIO}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                    showGrid={true}
                    objectFit="vertical-cover" // Ensures image covers the crop area vertically initially
                  />
                </div>

                <div className="cropper-controls">
                  <div className="zoom-slider-row">
                    <ZoomOut size={16} />
                    <input
                      type="range"
                      value={zoom}
                      min={1}
                      max={3}
                      step={0.1}
                      aria-labelledby="Zoom"
                      onChange={(e) => setZoom(e.target.value)}
                      className="zoom-range"
                    />
                    <ZoomIn size={16} />
                  </div>

                  <div className="cropper-actions">
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => setIsCropping(false)}
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      className="btn-save"
                      onClick={handleSaveCrop}
                    >
                      <Check size={16} />
                      <span>قص واعتماد</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="preview-wrapper">
                <div className="preview-card">
                  {/* Mirroring Frontend Product Card/Details Structure */}
                  <div className="preview-image-container">
                    <img
                      src={activeImage.url}
                      alt="Preview"
                      className="preview-image"
                    />
                  </div>
                  <div className="preview-overlay">
                    <button
                      type="button"
                      className="btn-edit-crop"
                      onClick={() => setIsCropping(true)}
                    >
                      <CropIcon size={16} />
                      <span>تعديل القص</span>
                    </button>
                  </div>
                </div>
                <p className="preview-hint">
                  هكذا سيظهر المنتج للمشتري (نسبة 4:5 مع ملء الإطار)
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state">
            <ImageIcon size={48} className="text-gray-300" />
            <p>لم يتم اختيار صور بعد</p>
          </div>
        )}
      </div>
    </div>
  );
}
