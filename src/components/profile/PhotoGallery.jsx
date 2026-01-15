import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function PhotoGallery({ photos = [], onPhotosChange, editable = true }) {
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file types and sizes
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return;
      }
      if (file.size > maxSize) {
        toast.error(`${file.name} exceeds 50MB limit`);
        return;
      }
    }

    // Check if total photos will exceed limit
    if (photos.length + files.length > 9) {
      toast.error(`You can only upload ${9 - photos.length} more photo(s)`);
      return;
    }

    setUploading(true);
    try {
      const uploadPromises = files.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const results = await Promise.all(uploadPromises);
      const newUrls = results.map(result => result.file_url);
      onPhotosChange([...photos, ...newUrls]);
      toast.success(`${files.length} photo(s) uploaded successfully`);
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload photos. Please try again.');
    }
    setUploading(false);
    e.target.value = ''; // Reset input
  };

  const handleRemove = (index) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  const handleDragEnd = (result) => {
    if (!result.destination || !editable) return;
    
    const items = Array.from(photos);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    onPhotosChange(items);
  };

  return (
    <div>
      {editable && (
        <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-xs font-semibold text-slate-700 mb-1">Photo Requirements:</p>
          <ul className="text-xs text-slate-600 space-y-0.5">
            <li>• Max size: 50MB per photo</li>
            <li>• Formats: JPG, PNG, GIF, WebP</li>
            <li>• Recommended: 1080p or higher quality</li>
            <li>• Maximum: 9 photos total</li>
            <li>• Drag to reorder photos</li>
          </ul>
        </div>
      )}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="photos" direction="horizontal">
          {(provided) => (
            <div 
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="grid grid-cols-3 gap-3"
            >
              {photos.map((photo, index) => (
                <Draggable key={photo} draggableId={photo} index={index} isDragDisabled={!editable}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`relative aspect-square rounded-xl overflow-hidden group cursor-pointer ${
                          snapshot.isDragging ? 'ring-2 ring-violet-400 shadow-lg' : ''
                        }`}
                        onClick={() => !snapshot.isDragging && setSelectedPhoto(photo)}
                      >
                        <img 
                          src={photo} 
                          alt={`Gallery ${index + 1}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          onContextMenu={(e) => e.preventDefault()}
                          draggable={false}
                          style={{ pointerEvents: editable ? 'auto' : 'none', userSelect: 'none', WebkitUserDrag: 'none' }}
                        />
                        {editable && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemove(index);
                            }}
                            className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4 text-white" />
                          </button>
                        )}
                      </motion.div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              {editable && photos.length < 9 && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-violet-200 hover:border-violet-400 flex flex-col items-center justify-center cursor-pointer transition-colors bg-violet-50/50 hover:bg-violet-50">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  {uploading ? (
                    <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-8 h-8 text-violet-400 mb-1" />
                      <span className="text-xs text-violet-500">Add Photo</span>
                      <span className="text-xs text-violet-400 mt-1">Max 50MB</span>
                    </>
                  )}
                </label>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              src={selectedPhoto}
              alt="Full size"
              className="max-w-full max-h-full rounded-lg object-contain"
              onContextMenu={(e) => e.preventDefault()}
              draggable={false}
              style={{ userSelect: 'none', WebkitUserDrag: 'none' }}
            />
            <button
              className="absolute top-6 right-6 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"
              onClick={() => setSelectedPhoto(null)}
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}