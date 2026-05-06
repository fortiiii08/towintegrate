import { useNavigate } from "react-router-dom";
import { Calendar, Link2, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const subMenuItems = [
  {
    id: "agenda",
    title: "Agenda",
    description: "Gerenciar datas de gravação",
    icon: Calendar,
    path: "/gravacoes/agenda",
  },
  {
    id: "postagens",
    title: "Postagens",
    description: "Repositório de links por cliente",
    icon: Link2,
    path: "/gravacoes/postagens",
  },
];

const Gravacoes = () => {
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
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Calendar className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Agenda</h1>
            <p className="text-muted-foreground mt-1">
              Selecione uma opção
            </p>
          </div>
        </div>
      </header>

      {/* Sub Menu */}
      <main className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {subMenuItems.map((item) => (
            <Card
              key={item.id}
              onClick={() => navigate(item.path)}
              className="group p-8 flex flex-col items-center text-center transition-all duration-300 cursor-pointer hover:shadow-lg hover:scale-[1.02] hover:border-primary/50"
            >
              <div className="bg-primary w-16 h-16 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <item.icon className="w-8 h-8 text-primary-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {item.title}
              </h2>
              <p className="text-sm text-muted-foreground">
                {item.description}
              </p>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Gravacoes;
