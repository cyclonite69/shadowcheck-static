import { useRef, useState } from 'react';

type NetworkNotesProps = {
  logError: (message: string, error?: unknown) => void;
};

export const useNetworkNotes = ({ logError }: NetworkNotesProps) => {
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedBssid, setSelectedBssid] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState('general');
  const [noteAttachments, setNoteAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveNote = async () => {
    if (!noteContent.trim() || !selectedBssid) return;

    try {
      // Step 1: Create the note
      const response = await fetch('/api/admin/network-notes/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bssid: selectedBssid,
          content: noteContent,
          note_type: noteType,
          user_id: 'geospatial_user',
        }),
      });

      if (!response.ok) throw new Error('Failed to create note');

      const data = await response.json();
      const noteId = data.note_id;

      // Step 2: Upload attachments if any
      if (noteAttachments.length > 0) {
        for (const file of noteAttachments) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('bssid', selectedBssid);

          const mediaResponse = await fetch(`/api/admin/network-notes/${noteId}/media`, {
            method: 'POST',
            body: formData,
          });

          if (!mediaResponse.ok) {
            console.warn(`Failed to upload media: ${file.name}`);
          }
        }
      }

      // Success: Reset form
      setShowNoteModal(false);
      setNoteContent('');
      setNoteType('general');
      setSelectedBssid('');
      setNoteAttachments([]);
    } catch (err) {
      logError('Failed to save note', err);
    }
  };

  const handleAddAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setNoteAttachments((prev) => [...prev, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setNoteAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return {
    showNoteModal,
    setShowNoteModal,
    selectedBssid,
    setSelectedBssid,
    noteContent,
    setNoteContent,
    noteType,
    setNoteType,
    noteAttachments,
    setNoteAttachments,
    fileInputRef,
    handleSaveNote,
    handleAddAttachment,
    removeAttachment,
  };
};
