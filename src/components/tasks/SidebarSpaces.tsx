import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, Plus, List, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Space, TaskList } from "@/hooks/useTasks";

interface SidebarSpacesProps {
  spaces: Space[];
  lists: TaskList[];
  selectedSpace: string | null;
  selectedList: string | null;
  onSelectSpace: (id: string) => void;
  onSelectList: (id: string) => void;
  onCreateSpace: () => void;
  onCreateList: () => void;
  onDeleteSpace?: (spaceId: string) => void;
  onDeleteList?: (listId: string) => void;
}

export function SidebarSpaces({
  spaces,
  lists,
  selectedSpace,
  selectedList,
  onSelectSpace,
  onSelectList,
  onCreateSpace,
  onCreateList,
  onDeleteSpace,
  onDeleteList,
}: SidebarSpacesProps) {
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(new Set());
  const [deleteSpaceDialog, setDeleteSpaceDialog] = useState<string | null>(null);
  const [deleteListDialog, setDeleteListDialog] = useState<string | null>(null);

  const toggleSpace = (spaceId: string) => {
    const newExpanded = new Set(expandedSpaces);
    if (newExpanded.has(spaceId)) {
      newExpanded.delete(spaceId);
    } else {
      newExpanded.add(spaceId);
    }
    setExpandedSpaces(newExpanded);
  };

  const getListsBySpace = (spaceId: string) => {
    return lists.filter(list => list.space_id === spaceId);
  };

  const handleDeleteSpace = (spaceId: string) => {
    onDeleteSpace?.(spaceId);
    setDeleteSpaceDialog(null);
  };

  const handleDeleteList = (listId: string) => {
    onDeleteList?.(listId);
    setDeleteListDialog(null);
  };

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">Espaços</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-white/30 hover:text-white hover:bg-white/10"
          onClick={onCreateSpace}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="space-y-1">
        {spaces.map((space) => {
          const spaceLists = getListsBySpace(space.id);
          const isExpanded = expandedSpaces.has(space.id) || selectedSpace === space.id;

          return (
            <div key={space.id}>
              <div className="flex items-center group">
                <button
                  onClick={() => {
                    onSelectSpace(space.id);
                    toggleSpace(space.id);
                  }}
                  className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                    selectedSpace === space.id
                      ? "bg-[#407b75]/20 text-[#5bbfb5]"
                      : "text-white/50 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 flex-shrink-0" />
                  )}
                  <Folder 
                    className="h-4 w-4 flex-shrink-0"
                    style={{ color: space.color || "#407b75" }}
                  />
                  <span className="truncate">{space.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {spaceLists.length}
                  </span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => setDeleteSpaceDialog(space.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir espaço
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {isExpanded && (
                <div className="ml-6 mt-1 space-y-0.5">
                  {spaceLists.map((list) => (
                    <div key={list.id} className="flex items-center group">
                      <button
                        onClick={() => onSelectList(list.id)}
                        className={`flex-1 flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors ${
                          selectedList === list.id
                            ? "bg-[#407b75]/15 text-[#5bbfb5]"
                            : "text-white/35 hover:bg-white/5 hover:text-white/70"
                        }`}
                      >
                        <List className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{list.name}</span>
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => setDeleteListDialog(list.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir lista
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                  {selectedSpace === space.id && (
                    <button
                      onClick={onCreateList}
                      className="w-full flex items-center gap-2 px-2 py-1 rounded text-xs text-white/20 hover:bg-white/5 hover:text-white/50 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Nova lista</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {spaces.length === 0 && (
          <p className="text-[10px] text-white/20 px-2 py-1">Nenhum espaço ainda</p>
        )}
      </div>

      <AlertDialog open={!!deleteSpaceDialog} onOpenChange={() => setDeleteSpaceDialog(null)}>
        <AlertDialogContent className="bg-[#18182a] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Excluir espaço?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">Todas as listas e tarefas serão excluídas permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteSpaceDialog && handleDeleteSpace(deleteSpaceDialog)} className="bg-red-600 hover:bg-red-700 text-white">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteListDialog} onOpenChange={() => setDeleteListDialog(null)}>
        <AlertDialogContent className="bg-[#18182a] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Excluir lista?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">Todas as tarefas dentro desta lista serão excluídas permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteListDialog && handleDeleteList(deleteListDialog)} className="bg-red-600 hover:bg-red-700 text-white">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
