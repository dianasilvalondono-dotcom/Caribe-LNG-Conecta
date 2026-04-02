import { useState, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { C } from '../lib/constants'
import { addKnowledgeDoc, updateKnowledgeDoc, deleteKnowledgeDoc, uploadKnowledgeFile } from '../lib/supabase'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

export default function KnowledgeBaseView({ docs, onReload, isMobile }) {
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ titulo: '', categoria: 'General', contenido: '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const categorias = ['General', 'Políticas DAC', 'Procedimientos', 'Marco Regulatorio', 'Acuerdos Marco', 'Comunicaciones', 'ESG', 'Otro']
  const fileInputRef = useRef(null)

  async function extractText(file) {
    const ext = file.name.split('.').pop().toLowerCase()
    const buf = await file.arrayBuffer()

    if (ext === 'pdf') {
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise
      const pages = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        pages.push(content.items.map(item => item.str).join(' '))
      }
      return pages.join('\n\n')
    }

    if (ext === 'docx') {
      const result = await mammoth.extractRawText({ arrayBuffer: buf })
      return result.value
    }

    if (ext === 'xlsx' || ext === 'xls') {
      const wb = XLSX.read(buf, { type: 'array' })
      const lines = []
      for (const name of wb.SheetNames) {
        lines.push(`--- ${name} ---`)
        const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name])
        lines.push(csv)
      }
      return lines.join('\n\n')
    }

    if (ext === 'pptx') {
      const zip = await JSZip.loadAsync(buf)
      const slides = []
      const slideFiles = Object.keys(zip.files)
        .filter(f => /^ppt\/slides\/slide\d+\.xml$/i.test(f))
        .sort((a, b) => {
          const na = parseInt(a.match(/slide(\d+)/)[1])
          const nb = parseInt(b.match(/slide(\d+)/)[1])
          return na - nb
        })
      for (const sf of slideFiles) {
        const xml = await zip.files[sf].async('text')
        const text = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        if (text) slides.push(text)
      }
      return slides.join('\n\n')
    }

    // Fallback: read as text (md, txt)
    return new TextDecoder().decode(buf)
  }

  function splitIntoChunks(text, name) {
    if (text.length <= 1900) return [{ titulo: name, contenido: text.trim() }]
    const sections = text.split(/(?=^## |\n\n---\s*\n)/m).filter(s => s.trim())
    const chunks = []
    let current = ''
    let currentTitle = name
    for (const section of sections) {
      const headingMatch = section.match(/^## (.+)/)
      const sectionTitle = headingMatch ? headingMatch[1].replace(/[#*_]/g, '').trim() : null
      if ((current + section).length > 1900 && current.length > 0) {
        chunks.push({ titulo: currentTitle, contenido: current.trim() })
        current = section
        currentTitle = sectionTitle ? `${name} - ${sectionTitle}` : `${name} (cont.)`
      } else {
        if (sectionTitle && !current) currentTitle = `${name} - ${sectionTitle}`
        current += section
      }
    }
    if (current.trim()) chunks.push({ titulo: currentTitle, contenido: current.trim() })
    return chunks
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const name = file.name.replace(/\.(md|txt|text|pdf|docx|xlsx|xls|pptx)$/i, '')
    setUploading(true)
    try {
      // Upload original file to storage
      let fileUrl = null
      try {
        fileUrl = await uploadKnowledgeFile(file)
        console.log('File uploaded:', fileUrl)
      } catch(err) {
        console.error('File storage error:', err)
        alert('Nota: el archivo no se pudo guardar en Storage (' + err.message + '), pero el texto se extraerá igual.')
      }

      // Extract text for AI knowledge base
      const text = await extractText(file)
      if (!text || !text.trim()) { alert('No se pudo extraer texto del archivo.'); return }
      const chunks = splitIntoChunks(text, name)
      if (!confirm(`Se subirá "${file.name}" y se creará${chunks.length > 1 ? `n ~${chunks.length} documentos` : ' 1 documento'} en la base de conocimiento (categoría: ${form.categoria}). ¿Continuar?`)) return
      for (let i = 0; i < chunks.length; i++) {
        await addKnowledgeDoc({ titulo: chunks[i].titulo, categoria: form.categoria, contenido: chunks[i].contenido, file_url: i === 0 ? fileUrl : null })
      }
      alert(`${fileUrl ? 'Archivo guardado. ' : ''}${chunks.length} documento${chunks.length > 1 ? 's' : ''} creado${chunks.length > 1 ? 's' : ''} desde "${file.name}"`)
      onReload()
    } catch(err) { alert('Error al procesar archivo: ' + err.message) }
    finally { setUploading(false) }
  }

  async function handleSave() {
    if (!form.titulo.trim() || !form.contenido.trim()) return
    setSaving(true)
    try {
      if (editing) {
        await updateKnowledgeDoc(editing, form)
      } else {
        await addKnowledgeDoc(form)
      }
      setForm({ titulo: '', categoria: 'General', contenido: '' })
      setEditing(null)
      onReload()
    } catch(e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este documento?')) return
    await deleteKnowledgeDoc(id)
    onReload()
  }

  const grouped = {}
  docs.forEach(d => { if (!grouped[d.categoria]) grouped[d.categoria] = []; grouped[d.categoria].push(d) })

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>Base de Conocimiento</h1>
        <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 14 }}>Documentos y contexto que el asistente IA usa para responder preguntas. Total: {docs.length} docs · ~{Math.round(docs.reduce((s,d) => s + (d.contenido?.length || 0), 0) / 1000)}K caracteres</p>
      </div>

      {/* Add/Edit form */}
      <div style={{ background: C.card, borderRadius: 12, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 20, borderLeft: `4px solid ${C.accent}` }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.accent, marginBottom: 12 }}>{editing ? 'Editar documento' : '+ Agregar documento'}</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <input value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} placeholder="Título del documento"
            style={{ flex: 2, minWidth: 200, border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
          <select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}
            style={{ flex: 1, minWidth: 150, border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: 'white' }}>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <textarea value={form.contenido} onChange={e => setForm({...form, contenido: e.target.value})}
          placeholder="Pega aquí el contenido del documento, política, procedimiento, etc. El asistente IA usará este texto para responder preguntas."
          style={{ width: '100%', minHeight: 140, border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 14,
            fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button onClick={handleSave} disabled={saving || !form.titulo.trim() || !form.contenido.trim()}
            style={{ background: saving ? '#94a3b8' : C.navy, color: 'white', border: 'none', borderRadius: 8, padding: '9px 20px',
              fontSize: 14, fontWeight: 700, cursor: saving ? 'wait' : 'pointer' }}>
            {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Guardar documento'}
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            style={{ background: uploading ? '#94a3b8' : '#f1f5f9', color: uploading ? 'white' : C.accent, border: `1px solid ${C.accent}33`, borderRadius: 8, padding: '9px 20px',
              fontSize: 14, fontWeight: 700, cursor: uploading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            {uploading ? 'Subiendo...' : 'Subir archivo'}
          </button>
          <input ref={fileInputRef} type="file" accept=".md,.txt,.text,.pdf,.docx,.xlsx,.xls,.pptx" onChange={handleFileUpload} style={{ display: 'none' }} />
          {editing && (
            <button onClick={() => { setEditing(null); setForm({ titulo: '', categoria: 'General', contenido: '' }) }}
              style={{ background: '#f1f5f9', color: C.text, border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Documents list by category */}
      {Object.keys(grouped).length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: C.subtle }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "#e0e7ff", margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#4f46e5" }}>K</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>No hay documentos aún</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Agrega documentos, políticas o procedimientos para que el asistente IA pueda responder preguntas sobre ellos.</div>
        </div>
      )}
      {Object.entries(grouped).map(([cat, catDocs]) => (
        <div key={cat} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{cat} ({catDocs.length})</div>
          {catDocs.map(d => (
            <div key={d.id} style={{ background: C.card, borderRadius: 10, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{d.titulo}</div>
                  <div style={{ fontSize: 12, color: C.subtle, marginTop: 2 }}>{(d.contenido?.length || 0).toLocaleString()} caracteres · {d.updated_at ? new Date(d.updated_at).toLocaleDateString('es-CO') : 'recién creado'}</div>
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.5, maxHeight: 60, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {d.contenido?.slice(0, 200)}{d.contenido?.length > 200 ? '...' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {d.file_url && (
                    <a href={d.file_url} target="_blank" rel="noopener"
                      style={{ background: '#f0fdf4', border: 'none', borderRadius: 6, padding: '8px 12px', fontSize: 13, fontWeight: 600, color: C.green, textDecoration: 'none', display: 'inline-block' }}>
                      Archivo
                    </a>
                  )}
                  <button onClick={() => { setEditing(d.id); setForm({ titulo: d.titulo, categoria: d.categoria, contenido: d.contenido }); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    style={{ background: '#f1f5f9', border: 'none', borderRadius: 6, padding: '8px 12px', fontSize: 13, cursor: 'pointer', fontWeight: 600, color: C.accent }}>
                    Editar
                  </button>
                  <button onClick={() => handleDelete(d.id)}
                    style={{ background: '#fef2f2', border: 'none', borderRadius: 6, padding: '8px 12px', fontSize: 13, cursor: 'pointer', fontWeight: 600, color: C.red }}>
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

