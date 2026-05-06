import { useNavigate } from "react-router-dom";
import { FileText, ArrowLeft, Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const Postagens = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container py-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 mb-4">
              <FileText className="w-8 h-8 text-accent" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Postagens</h1>
            <p className="text-muted-foreground mt-1">
              Gerenciamento de conteúdo
            </p>
          </div>
        </div>
      </header>

      {/* Coming Soon */}
      <main className="container py-12">
        <Card className="max-w-md mx-auto p-8 text-center">
          <Construction className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Em Desenvolvimento
          </h2>
          <p className="text-muted-foreground">
            Esta funcionalidade estará disponível em breve.
          </p>
        </Card>
      </main>
    </div>
  );
};

export default Postagens;
