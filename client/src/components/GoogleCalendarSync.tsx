import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar, Loader2, LogOut, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface GoogleCalendarSyncProps {
  year: number;
  month: number;
}

export default function GoogleCalendarSync({ year, month }: GoogleCalendarSyncProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: connectionStatus, refetch: refetchStatus } = trpc.googleCalendar.isConnected.useQuery();
  const { data: syncStatus, refetch: refetchSyncStatus } = trpc.googleCalendar.getSyncStatus.useQuery();
  
  const getAuthUrl = trpc.googleCalendar.getAuthUrl.useQuery(undefined, { enabled: false });
  const handleCallback = trpc.googleCalendar.handleCallback.useMutation();
  const disconnect = trpc.googleCalendar.disconnect.useMutation();
  const syncToGoogle = trpc.googleCalendar.syncToGoogle.useMutation();
  const syncFromGoogle = trpc.googleCalendar.syncFromGoogle.useMutation();
  const setAutoSync = trpc.googleCalendar.setAutoSync.useMutation();

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      const result = await getAuthUrl.refetch();
      
      if (result.data?.authUrl) {
        // Redirect to Google OAuth
        window.location.href = result.data.authUrl;
      }
    } catch (error) {
      console.error("Error connecting to Google Calendar:", error);
      toast.error("Erro ao conectar ao Google Calendar");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect.mutateAsync();
      await refetchStatus();
      toast.success("Google Calendar desconectado");
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast.error("Erro ao desconectar");
    }
  };

  const handleSyncToGoogle = async () => {
    try {
      setIsSyncing(true);
      const result = await syncToGoogle.mutateAsync({ year, month });
      toast.success(`${result.synced} eventos sincronizados para Google Calendar`);
      await refetchSyncStatus();
    } catch (error) {
      console.error("Error syncing to Google:", error);
      toast.error("Erro ao sincronizar para Google Calendar");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncFromGoogle = async () => {
    try {
      setIsSyncing(true);
      const result = await syncFromGoogle.mutateAsync({ year, month });
      toast.success(`${result.imported} eventos importados do Google Calendar`);
      await refetchSyncStatus();
    } catch (error) {
      console.error("Error syncing from Google:", error);
      toast.error("Erro ao importar do Google Calendar");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAutoSync = async (enabled: boolean) => {
    try {
      await setAutoSync.mutateAsync({ enabled });
      await refetchSyncStatus();
      toast.success(enabled ? "Auto-sync ativado" : "Auto-sync desativado");
    } catch (error) {
      console.error("Error setting auto-sync:", error);
      toast.error("Erro ao configurar auto-sync");
    }
  };

  if (!connectionStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Google Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Google Calendar
            </span>
            <Badge variant={connectionStatus.connected ? "default" : "secondary"}>
              {connectionStatus.connected ? "✓ Conectado" : "✗ Desconectado"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {connectionStatus.connected ? (
            <div className="space-y-3">
              <div className="text-sm">
                <p className="text-muted-foreground">Email conectado:</p>
                <p className="font-semibold">{connectionStatus.email}</p>
              </div>
              {connectionStatus.lastSync && (
                <div className="text-sm">
                  <p className="text-muted-foreground">Última sincronização:</p>
                  <p className="font-semibold">
                    {new Date(connectionStatus.lastSync).toLocaleString("pt-BR")}
                  </p>
                </div>
              )}
              <Button
                onClick={handleDisconnect}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Desconectar
              </Button>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground space-y-3">
              <p>Conecte seu Google Calendar para sincronizar eventos automaticamente.</p>
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Conectar ao Google Calendar
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Controls Card */}
      {connectionStatus.connected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Sincronização</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sync Buttons */}
            <div className="space-y-2">
              <Button
                onClick={handleSyncToGoogle}
                disabled={isSyncing}
                variant="outline"
                className="w-full"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Enviar para Google Calendar
                  </>
                )}
              </Button>
              <Button
                onClick={handleSyncFromGoogle}
                disabled={isSyncing}
                variant="outline"
                className="w-full"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Importar do Google Calendar
                  </>
                )}
              </Button>
            </div>

            {/* Auto-Sync Toggle */}
            {syncStatus && (
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-sync" className="text-sm cursor-pointer">
                    Sincronização Automática
                  </Label>
                  <Switch
                    id="auto-sync"
                    checked={syncStatus.autoSync}
                    onCheckedChange={handleAutoSync}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {syncStatus.autoSync
                    ? "Próxima sincronização: " + (syncStatus.nextSync ? new Date(syncStatus.nextSync).toLocaleString("pt-BR") : "em breve")
                    : "Ative para sincronizar automaticamente a cada dia"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm text-blue-700">Sobre Sincronização</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-700 space-y-2">
          <p>• Sincronize seus eventos de planejamento com Google Calendar</p>
          <p>• Importe eventos do Google Calendar para o sistema</p>
          <p>• Ative sincronização automática para manter tudo atualizado</p>
          <p>• Conflitos serão resolvidos mantendo a versão mais recente</p>
        </CardContent>
      </Card>
    </div>
  );
}
