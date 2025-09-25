import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Bold, Italic, List, Link, Image } from "lucide-react";
import { useState } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const [showToolbar, setShowToolbar] = useState(false);

  // For now, this is a simple textarea. In a production app, you would integrate
  // a proper rich text editor like TinyMCE, Quill, or build a more sophisticated one.
  
  return (
    <div className="border border-input rounded-md">
      {/* Toolbar */}
      <div className="border-b border-input p-2 flex items-center space-x-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-testid="button-bold"
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-testid="button-italic"
        >
          <Italic className="w-4 h-4" />
        </Button>
        <div className="w-px h-4 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-testid="button-list"
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-testid="button-link"
        >
          <Link className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-testid="button-image"
        >
          <Image className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Editor */}
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[200px] border-0 focus-visible:ring-0 resize-none"
        data-testid="textarea-rich-editor"
      />
    </div>
  );
}
