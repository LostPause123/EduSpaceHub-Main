import { useState } from 'react'
import type { Navigate } from '../../types'
import { Card, Badge, Button, Input, SearchIcon, DownloadIcon, FileTextIcon } from '../../components/ui'
import { materials } from '../../data/mockData'
import type { Material } from '../../types'

interface LearningMaterialsProps { navigate: Navigate }

const categories = ['All', 'Lecture Notes', 'Practice Sets', 'Study Guides', 'Reference', 'Slides']
const subjects = ['All subjects', 'Mathematics', 'Physics', 'Chemistry', 'Computer Science', 'Economics']

const typeIcons: Record<Material['type'], string> = {
  pdf: 'PDF',
  docx: 'DOC',
  pptx: 'PPT',
  video: 'VID',
  link: 'URL',
}

const typeColors: Record<Material['type'], string> = {
  pdf: 'text-destructive bg-destructive/10',
  docx: 'text-primary bg-primary-50',
  pptx: 'text-warning bg-warning-50',
  video: 'text-foreground bg-secondary',
  link: 'text-foreground bg-secondary',
}

export default function LearningMaterials({ navigate }: LearningMaterialsProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [subject, setSubject] = useState('All subjects')

  const filtered = materials.filter((m) => {
    const q = query.toLowerCase()
    const matchQuery = !q || m.title.toLowerCase().includes(q) || m.subject.toLowerCase().includes(q) || m.tags.some((t) => t.toLowerCase().includes(q))
    const matchCat = category === 'All' || m.category === category
    const matchSub = subject === 'All subjects' || m.subject === subject
    return matchQuery && matchCat && matchSub
  })

  return (
    <div className="px-6 lg:px-8 py-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Learning materials</h1>
        <p className="text-sm text-muted-foreground mt-1">Notes, practice sets, and resources shared by your tutors</p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <Input
          placeholder="Search materials..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leftIcon={<SearchIcon size={15} />}
        />
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              category === c
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Subject filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {subjects.map((s) => (
          <button
            key={s}
            onClick={() => setSubject(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
              subject === s
                ? 'border-foreground text-foreground bg-transparent'
                : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Results */}
      <p className="text-sm text-muted-foreground mb-4">
        {filtered.length} material{filtered.length !== 1 ? 's' : ''}
      </p>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm">No materials match your search.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((material) => (
            <MaterialCard key={material.id} material={material} />
          ))}
        </div>
      )}
    </div>
  )
}

function MaterialCard({ material }: { material: Material }) {
  const [downloading, setDownloading] = useState(false)

  function handleDownload() {
    setDownloading(true)
    setTimeout(() => setDownloading(false), 1000)
  }

  return (
    <Card className="p-5 flex flex-col gap-3 hover:shadow-sm transition-all">
      <div className="flex items-start gap-3">
        <div className={`px-2 py-1 rounded text-[10px] font-bold shrink-0 ${typeColors[material.type]}`}>
          {typeIcons[material.type]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">{material.title}</p>
          <p className="text-xs text-muted-foreground mt-1">{material.subject} · {material.category}</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{material.description}</p>

      <div className="flex flex-wrap gap-1">
        {material.tags.map((tag) => (
          <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="text-xs text-muted-foreground">
          <p>{material.uploadedBy}</p>
          <p>{material.uploadedAt} · {material.fileSize} · {material.downloads} downloads</p>
        </div>
        <Button size="xs" variant="outline" loading={downloading} onClick={handleDownload}>
          <DownloadIcon size={12} />
          Download
        </Button>
      </div>
    </Card>
  )
}
