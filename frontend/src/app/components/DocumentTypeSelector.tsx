import { useState } from 'react';
import { FileText, Edit, BookOpen, HelpCircle } from 'lucide-react';

interface DocumentTypeSelectorProps {
  selected: string[];
  onSelect: (types: string[]) => void;
}

export default function DocumentTypeSelector({ selected, onSelect }: DocumentTypeSelectorProps) {
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

  const types = [
    {
      id: 'execution',
      label: '실행 안내형',
      icon: FileText,
      subtitle: '준비물·일정이 있는 안내문',
      description: '체험학습, 준비물, 행사 일정처럼\n챙기고 기억해야 하는 경우'
    },
    {
      id: 'submission',
      label: '작성·제출형',
      icon: Edit,
      subtitle: '작성해서 제출해야 하는 문서',
      description: '동의서, 신청서처럼\n쓰고 제출해야 하는 경우'
    },
    {
      id: 'learning',
      label: '학습 수행형',
      icon: BookOpen,
      subtitle: '이해하고 직접 해야 하는 과제',
      description: '숙제, 수행평가, 독서록처럼\n읽고 수행해야 하는 경우'
    }
  ];

  const handleToggle = (typeId: string) => {
    if (selected.includes(typeId)) {
      onSelect(selected.filter(id => id !== typeId));
    } else {
      onSelect([...selected, typeId]);
    }
  };

  const toggleExpand = (typeId: string) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(typeId)) {
      newExpanded.delete(typeId);
    } else {
      newExpanded.add(typeId);
    }
    setExpandedTypes(newExpanded);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {types.map((type) => {
        const Icon = type.icon;
        const isSelected = selected.includes(type.id);
        const isExpanded = expandedTypes.has(type.id);
        return (
          <div
            key={type.id}
            className={`p-4 rounded-xl border-2 transition-all ${
              isSelected
                ? 'border-2 bg-white'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
            style={isSelected ? { borderColor: '#354d3f', backgroundColor: '#f9f3ef' } : {}}
          >
            <button
              onClick={() => handleToggle(type.id)}
              className="w-full text-left"
            >
              <Icon
                className={`w-6 h-6 mb-3 ${isSelected ? '' : 'text-gray-600'}`}
                style={isSelected ? { color: '#354d3f' } : {}}
              />
              <div className="font-bold text-gray-900 mb-1">{type.label}</div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-700 flex-1 font-medium">
                  {type.subtitle}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(type.id);
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <HelpCircle className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </button>
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600 leading-relaxed whitespace-pre-line">
                {type.description}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
