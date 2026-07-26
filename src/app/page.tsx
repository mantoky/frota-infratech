'use client';

import { useState, useEffect } from 'react';

import { Vehicle, PageType, FilterType, ChecklistPhoto } from '@/types';
import translations from '@/lib/translations.json';
import {
  calculateDriverKm,
  getDriverStats,
  generateVehicleId,
  findLastWithdrawal,
  haversineKm,
  parseDateTime,
} from '@/lib/helpers';
import { GeoPoint } from '@/lib/geolocation';
import { useFleetData } from '@/lib/hooks/useFleetData';
import { useOrgData } from '@/lib/hooks/useOrgData';
import { generateFleetReport } from '@/lib/pdf';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import DashboardPage from '@/components/dashboard/DashboardPage';
import HistoryPanel from '@/components/dashboard/HistoryPanel';
import WithdrawModal from '@/components/modals/WithdrawModal';
import ReturnModal from '@/components/modals/ReturnModal';
import ServiceModal from '@/components/modals/ServiceModal';
import ManageModal from '@/components/modals/ManageModal';
import AddModal from '@/components/modals/AddModal';
import ConfirmPasswordModal from '@/components/modals/ConfirmPasswordModal';
import LoginScreen from '@/components/auth/LoginScreen';
import AccessPending from '@/components/auth/AccessPending';
import AdminPage from '@/components/admin/AdminPage';
import MetricsPage from '@/components/metrics/MetricsPage';
import ForumPage from '@/components/forum/ForumPage';
import RegionaisPage from '@/components/org/RegionaisPage';
import { useInstallPrompt } from '@/lib/hooks/useInstallPrompt';
import { useAuth } from '@/lib/hooks/useAuth';
import PageHeader from '@/components/ui/PageHeader';
import Card, { CardHeader } from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { FileDown, Trophy, Users, Sun, Moon, Download, LogOut } from 'lucide-react';

const t = (key: string, lang: string): string => {
  const translationsData = translations as Record<string, Record<string, string>>;
  return translationsData[key]?.[lang] || translationsData[key]?.['pt'] || key;
};

/** Linha de configuracao: rotulo/descricao a esquerda, controle a direita.
 *  No mobile o controle desce pra baixo do texto em vez de espremer os dois
 *  na mesma linha, que era o que fazia o select de idioma ficar cortado. */
function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 'var(--space-4)',
        flexWrap: 'wrap',
        padding: 'var(--space-5)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div style={{ minWidth: 220, flex: 1 }}>
        <h3
          style={{ margin: 0, fontSize: '0.95rem', fontWeight: 650, color: 'var(--text-primary)' }}
        >
          {title}
        </h3>
        <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}

export default function FrotaInfratech() {
  const { vehicles, setVehicles, history, drivers, saveDrivers, loading, saveData, addToHistory } =
    useFleetData();
  const {
    regionais,
    gerencias,
    forumPosts,
    checklistFields,
    saveChecklistFields,
    createRegional,
    createGerencia,
    addForumPost,
    addForumComment,
    likeForumPost,
  } = useOrgData();
  const { canInstall, promptInstall } = useInstallPrompt();

  // A sessao passa a mandar em quem e admin. Antes isso vinha de
  // localStorage.isAdmin, que o proprio usuario podia editar no console do
  // navegador - e do PIN, que estava em texto claro no bundle.
  const {
    profile,
    loading: authLoading,
    isActive,
    isAdmin,
    status: authStatus,
    signIn,
    signUp,
    logout: signOutUser,
    resetPassword,
    reauthenticate,
  } = useAuth();

  const [currentFilter, setCurrentFilter] = useState<FilterType>('all');
  const [currentLang, setCurrentLang] = useState('pt');
  const [theme, setTheme] = useState('light');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');

  const [withdrawModal, setWithdrawModal] = useState(false);
  const [returnModal, setReturnModal] = useState(false);
  const [serviceModal, setServiceModal] = useState(false);
  const [manageModal, setManageModal] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [serviceType, setServiceType] = useState<'man' | 'lav'>('man');
  const [confirmError, setConfirmError] = useState('');
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [pendingVehicleData, setPendingVehicleData] = useState<Partial<Vehicle> | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- preferencias moram no
       localStorage, que nao existe no build estatico. Ler no useState
       quebraria a hidratacao: o HTML pre-renderizado nunca teve acesso a ele,
       mas o primeiro render no navegador teria, gerando arvores diferentes.
       Mesma justificativa ja documentada em useFleetData. */
    const storedLang = localStorage.getItem('frota_lang');
    const storedTheme = localStorage.getItem('theme');
    if (storedLang) setCurrentLang(storedLang);
    if (storedTheme) setTheme(storedTheme);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  const changeLanguage = (lang: string) => {
    setCurrentLang(lang);
    localStorage.setItem('frota_lang', lang);
  };
  const logout = () => {
    signOutUser();
    setCurrentPage('dashboard');
  };

  // Step-up de verdade no lugar do PIN: antes de uma acao destrutiva, o
  // Firebase reconfirma a senha contra o servidor de autenticacao. O PIN
  // anterior era uma constante embutida no bundle - qualquer pessoa que
  // abrisse o JavaScript o encontrava.
  const confirmSensitiveAction = async (senha: string) => {
    setConfirmError('');
    try {
      await reauthenticate(senha);
    } catch {
      setConfirmError('Senha incorreta.');
      return;
    }
    setConfirmModal(false);
    if (pendingAction === 'delete' && selectedVehicle) deleteVehicle();
    else if (pendingAction === 'add' && pendingVehicleData) addNewVehicle(pendingVehicleData);
    else if (pendingAction === 'unblock' && selectedVehicle) unblockVehicle();
    setPendingAction(null);
    setPendingVehicleData(null);
  };

  const deleteVehicle = () => {
    if (!selectedVehicle) return;
    const newVehicles = vehicles.filter((v) => v.id !== selectedVehicle.id);
    setVehicles(newVehicles);
    saveData(newVehicles, history);
    setManageModal(false);
    setSelectedVehicle(null);
  };

  const addNewVehicle = (data: Partial<Vehicle>) => {
    const newVehicle: Vehicle = {
      id: generateVehicleId(),
      tag: data.tag || '',
      plate: data.plate || '',
      model: data.model || '',
      status: data.status || 'disp',
      km: data.km || 0,
      fuel: data.fuel || 50,
      fuelText: data.fuelText || '50%',
      maintenance: data.maintenance || 10000,
      driver: '',
      lastLocation: '',
      obs: '',
      regionalId: data.regionalId || regionais[0]?.id,
      gerenciaId: data.gerenciaId,
      lastStatusChangeAt: new Date().toISOString(),
      lastWashedAt: new Date().toISOString(),
    };
    const newVehicles = [...vehicles, newVehicle];
    setVehicles(newVehicles);
    saveData(newVehicles, history);
    setAddModal(false);
  };

  const openWithdrawModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setWithdrawModal(true);
  };
  const openReturnModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setReturnModal(true);
  };
  const openServiceModal = (type: 'man' | 'lav', vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setServiceType(type);
    setServiceModal(true);
  };
  const openManageModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setManageModal(true);
  };

  const handleWithdrawConfirm = (data: {
    driver: string;
    km: number;
    fuel: string;
    fuelPercent: number;
    obs: string;
    location: GeoPoint | null;
    photos: ChecklistPhoto[];
    customChecklistData: Record<string, boolean>;
  }) => {
    if (!selectedVehicle) return;
    const nowIso = new Date().toISOString();
    const updatedVehicle: Vehicle = {
      ...selectedVehicle,
      status: 'uso',
      driver: data.driver,
      km: data.km,
      fuel: data.fuelPercent,
      fuelText: data.fuel,
      obs: data.obs,
      lastStatusChangeAt: nowIso,
    };
    const newVehicles = vehicles.map((v) => (v.id === selectedVehicle.id ? updatedVehicle : v));
    setVehicles(newVehicles);
    addToHistory(updatedVehicle, 'Retirada', data.driver, data.km, data.obs || '', newVehicles, {
      location: data.location || undefined,
      photos: data.photos,
      customChecklistData: data.customChecklistData,
    });
    setWithdrawModal(false);
    setSelectedVehicle(null);
  };

  const handleReturnConfirm = (data: {
    km: number;
    fuel: string;
    fuelPercent: number;
    location: string;
    locationSpecify: string;
    obs: string;
    coords: GeoPoint | null;
  }) => {
    if (!selectedVehicle) return;
    const location = data.location === 'Outros' ? data.locationSpecify : data.location;
    const updatedVehicle: Vehicle = {
      ...selectedVehicle,
      status: 'disp',
      driver: '',
      km: data.km,
      fuel: data.fuelPercent,
      fuelText: data.fuel,
      lastLocation: location,
      obs: data.obs,
      lastStatusChangeAt: new Date().toISOString(),
    };
    const newVehicles = vehicles.map((v) => (v.id === selectedVehicle.id ? updatedVehicle : v));
    const withdrawal = findLastWithdrawal(
      `${updatedVehicle.tag} (${updatedVehicle.plate})`,
      history
    );
    let distanceKm: number | undefined;
    let travelTimeMinutes: number | undefined;
    if (withdrawal?.location && data.coords) {
      distanceKm = haversineKm(withdrawal.location, data.coords);
      travelTimeMinutes = Math.max(
        0,
        (Date.now() - parseDateTime(withdrawal.date).getTime()) / 60000
      );
    }
    setVehicles(newVehicles);
    addToHistory(updatedVehicle, 'Devolucao', '', data.km, data.obs || location, newVehicles, {
      location: data.coords || undefined,
      distanceKm,
      travelTimeMinutes,
    });
    setReturnModal(false);
    setSelectedVehicle(null);
  };

  const handleServiceConfirm = (data: { driver: string; km: number; obs: string }) => {
    if (!selectedVehicle) return;
    const nowIso = new Date().toISOString();
    const updatedVehicle: Vehicle = {
      ...selectedVehicle,
      status: serviceType,
      driver: data.driver,
      km: data.km,
      obs: data.obs,
      lastStatusChangeAt: nowIso,
      lastWashedAt: serviceType === 'lav' ? nowIso : selectedVehicle.lastWashedAt,
    };
    const newVehicles = vehicles.map((v) => (v.id === selectedVehicle.id ? updatedVehicle : v));
    setVehicles(newVehicles);
    addToHistory(
      updatedVehicle,
      serviceType === 'man' ? 'Envio Manutencao' : 'Envio Lavador',
      data.driver,
      data.km,
      data.obs,
      newVehicles
    );
    setServiceModal(false);
    setSelectedVehicle(null);
  };

  const handleManageSave = (data: Partial<Vehicle>) => {
    if (!selectedVehicle) return;
    const updatedVehicle = {
      ...selectedVehicle,
      ...data,
      lastStatusChangeAt: new Date().toISOString(),
    } as Vehicle;
    const newVehicles = vehicles.map((v) => (v.id === selectedVehicle.id ? updatedVehicle : v));
    setVehicles(newVehicles);
    saveData(newVehicles, history);
    setManageModal(false);
    setSelectedVehicle(null);
  };

  const blockVehicle = (reason: string) => {
    if (!selectedVehicle) return;
    const updatedVehicle: Vehicle = {
      ...selectedVehicle,
      blocked: true,
      blockedReason: reason,
      blockedBy: isAdmin ? 'Admin' : 'Usuario',
      blockedAt: new Date().toLocaleDateString('pt-BR'),
    };
    const newVehicles = vehicles.map((v) => (v.id === selectedVehicle.id ? updatedVehicle : v));
    setVehicles(newVehicles);
    saveData(newVehicles, history);
  };

  const unblockVehicle = () => {
    if (!selectedVehicle) return;
    const updatedVehicle: Vehicle = {
      ...selectedVehicle,
      blocked: false,
      blockedReason: '',
      blockedBy: '',
      blockedAt: '',
    };
    const newVehicles = vehicles.map((v) => (v.id === selectedVehicle.id ? updatedVehicle : v));
    setVehicles(newVehicles);
    saveData(newVehicles, history);
  };

  const handleAddVehicle = (data: Partial<Vehicle>) => {
    // Quem nao e administrador simplesmente nao cadastra veiculo - e as rules
    // recusam a escrita mesmo que a interface deixasse passar. Antes isso era
    // "pede o PIN", o que dava a falsa impressao de barreira.
    if (!isAdmin) return;
    addNewVehicle(data);
  };

  const requestSensitiveAction = (action: 'delete' | 'unblock') => {
    setPendingAction(action);
    setConfirmError('');
    if (action === 'delete') setManageModal(false);
    setConfirmModal(true);
  };

  const downloadPDF = () => generateFleetReport(vehicles, history);

  const handleCreateRegional = (data: { name: string; code: string; description: string }) => {
    createRegional(data, (seedVehicle) => {
      const newVehicles = [...vehicles, seedVehicle];
      setVehicles(newVehicles);
      saveData(newVehicles, history);
    });
  };

  // Enquanto o Firebase nao responde se ha sessao, nada e renderizado. Mostrar
  // a tela de login por um instante e depois trocar pelo app produz um flash
  // que ja foi bug reportado neste projeto.
  if (authLoading)
    return <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg-main)' }} />;

  if (!profile && authStatus === null) {
    return (
      <LoginScreen
        currentLang={currentLang}
        canInstall={canInstall}
        onInstall={promptInstall}
        onSignIn={signIn}
        onSignUp={signUp}
        onResetPassword={resetPassword}
      />
    );
  }

  // Autenticado mas nao liberado. Estados distintos merecem mensagens
  // distintas: quem aguarda aprovacao precisa saber que basta esperar; quem
  // foi bloqueado precisa saber que deve procurar o administrador.
  if (!isActive) {
    return (
      <AccessPending status={authStatus} nome={profile?.displayName || ''} onLogout={logout} />
    );
  }

  if (loading) {
    // Skeleton no formato da grade real em vez de um spinner: em rede fraca o
    // usuario ja enxerga onde o conteudo vai cair, e a troca pro conteudo
    // final nao reposiciona a pagina inteira.
    return (
      <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg-main)' }}>
        <div className="page-shell" aria-busy="true" aria-label="Carregando frota">
          <div className="skeleton" style={{ height: 34, width: 280, marginBottom: 12 }} />
          <div
            className="skeleton"
            style={{ height: 18, width: 420, maxWidth: '80%', marginBottom: 28 }}
          />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 'var(--space-3)',
              marginBottom: 'var(--space-6)',
            }}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 116 }} />
            ))}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 'var(--space-3)',
            }}
          >
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 148 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--bg-main)',
        color: 'var(--text-primary)',
      }}
    >
      <Sidebar
        currentPage={currentPage}
        currentFilter={currentFilter}
        sidebarOpen={sidebarOpen}
        currentLang={currentLang}
        isAdmin={isAdmin}
        onNavigate={setCurrentPage}
        onFilterChange={setCurrentFilter}
        onHistoryOpen={() => setHistoryPanelOpen(true)}
        onClose={() => setSidebarOpen(false)}
      />

      {/* app-main--docked reserva a coluna da sidebar a partir de 1024px.
          A regra e puramente CSS - ver globals.css. */}
      <main className="app-main--docked" style={{ minHeight: '100dvh' }}>
        <TopBar
          sidebarOpen={sidebarOpen}
          currentLang={currentLang}
          isAdmin={isAdmin}
          theme={theme}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onToggleTheme={toggleTheme}
          onNavigate={setCurrentPage}
          onAddVehicle={() => setAddModal(true)}
        />

        {currentPage === 'dashboard' && (
          <DashboardPage
            vehicles={vehicles}
            currentFilter={currentFilter}
            currentLang={currentLang}
            isAdmin={isAdmin}
            onFilterChange={setCurrentFilter}
            onWithdraw={openWithdrawModal}
            onReturn={openReturnModal}
            onService={openServiceModal}
            onManage={openManageModal}
          />
        )}

        {currentPage === 'metrics' && (
          <MetricsPage vehicles={vehicles} history={history} currentLang={currentLang} />
        )}

        {currentPage === 'forum' && (
          <ForumPage
            posts={forumPosts}
            isAdmin={isAdmin}
            onAddPost={addForumPost}
            onAddComment={addForumComment}
            onLikePost={likeForumPost}
          />
        )}

        {currentPage === 'regionais' && (
          <RegionaisPage
            regionais={regionais}
            gerencias={gerencias}
            vehicles={vehicles}
            isAdmin={isAdmin}
            currentLang={currentLang}
            onCreateRegional={handleCreateRegional}
            onCreateGerencia={createGerencia}
          />
        )}

        {currentPage === 'admin' && isAdmin && (
          <AdminPage
            vehicles={vehicles}
            drivers={drivers}
            currentLang={currentLang}
            checklistFields={checklistFields}
            onManage={openManageModal}
            onAddVehicle={() => setAddModal(true)}
            onSaveDrivers={saveDrivers}
            onSaveChecklistFields={saveChecklistFields}
          />
        )}

        {currentPage === 'drivers' && (
          <div className="page-shell">
            <PageHeader
              eyebrow="Relatórios"
              title={t('driversTitle', currentLang)}
              description={t('driversSubtitle', currentLang)}
              actions={
                <button type="button" className="btn btn-outline btn-sm" onClick={downloadPDF}>
                  <FileDown size={15} /> {t('btnDownloadHistory', currentLang)}
                </button>
              }
            />
            <Card>
              <CardHeader
                title={t('topDrivers', currentLang)}
                description="Ranking por número de retiradas nos últimos 30 dias."
                icon={<Trophy size={18} />}
              />
              {getDriverStats(history).length === 0 ? (
                <EmptyState
                  icon={<Users size={24} />}
                  title={t('noRecords', currentLang)}
                  description="O ranking é montado a partir das retiradas registradas. Assim que houver movimentação, ela aparece aqui."
                />
              ) : (
                <ol
                  style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    display: 'grid',
                    gap: 'var(--space-2)',
                  }}
                >
                  {getDriverStats(history).map((driver, index) => (
                    <li
                      key={driver[0]}
                      className="surface-inset"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        padding: 'var(--space-3)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-3)',
                          minWidth: 0,
                        }}
                      >
                        {/* Posicao em numero, nao so medalha: a partir do 4o
                            lugar todos usavam o mesmo emoji e nao dava pra
                            saber quem era 4o e quem era 9o. */}
                        <span
                          className="tabular"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 28,
                            height: 28,
                            flexShrink: 0,
                            borderRadius: 'var(--radius-pill)',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            backgroundColor:
                              index < 3 ? 'var(--brand-accent-soft)' : 'var(--bg-card)',
                            color: index < 3 ? 'var(--alert-text)' : 'var(--text-secondary)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          {index + 1}
                        </span>
                        <strong style={{ fontWeight: 650 }}>{driver[0]}</strong>
                      </span>
                      <span
                        className="tabular"
                        style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}
                      >
                        <strong style={{ color: 'var(--text-primary)' }}>{driver[1]}</strong>{' '}
                        {t('withdrawals', currentLang)}
                        {' · '}
                        {calculateDriverKm(driver[0], history).toLocaleString('pt-BR')} km
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>
        )}

        {currentPage === 'settings' && (
          <div className="page-shell">
            <PageHeader
              eyebrow="Sistema"
              title={t('settingsTitle', currentLang)}
              description={t('settingsSubtitle', currentLang)}
            />
            <Card padding="none">
              <SettingRow
                title={t('setLang', currentLang)}
                description={t('setLangDesc', currentLang)}
              >
                <label htmlFor="lang-select" className="sr-only">
                  {t('setLang', currentLang)}
                </label>
                <select
                  id="lang-select"
                  className="field"
                  style={{ width: 'auto', minWidth: 150 }}
                  value={currentLang}
                  onChange={(e) => changeLanguage(e.target.value)}
                >
                  <option value="pt">Português</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </SettingRow>

              <SettingRow
                title={t('setTheme', currentLang)}
                description={
                  theme === 'dark'
                    ? t('setThemeDark', currentLang)
                    : t('setThemeLight', currentLang)
                }
              >
                <button type="button" className="btn btn-outline btn-sm" onClick={toggleTheme}>
                  {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                  {theme === 'dark'
                    ? t('setThemeLight', currentLang)
                    : t('setThemeDark', currentLang)}
                </button>
              </SettingRow>

              {canInstall && (
                <SettingRow
                  title={t('setInstallApp', currentLang)}
                  description={t('setInstallAppDesc', currentLang)}
                >
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={promptInstall}
                  >
                    <Download size={15} /> {t('btnInstallApp', currentLang)}
                  </button>
                </SettingRow>
              )}

              <SettingRow
                title="Encerrar sessão"
                description="Sai do aplicativo e exige nova autenticação no próximo acesso."
              >
                <button type="button" className="btn btn-outline btn-sm" onClick={logout}>
                  <LogOut size={15} /> {t('btnLogout', currentLang)}
                </button>
              </SettingRow>
            </Card>
          </div>
        )}
      </main>

      <HistoryPanel
        isOpen={historyPanelOpen}
        onClose={() => setHistoryPanelOpen(false)}
        history={history}
        currentLang={currentLang}
        onDownloadPdf={downloadPDF}
      />

      <WithdrawModal
        isOpen={withdrawModal}
        onClose={() => setWithdrawModal(false)}
        vehicle={selectedVehicle}
        currentLang={currentLang}
        drivers={drivers}
        checklistFields={checklistFields}
        onConfirm={handleWithdrawConfirm}
      />
      <ServiceModal
        isOpen={serviceModal}
        onClose={() => setServiceModal(false)}
        vehicle={selectedVehicle}
        serviceType={serviceType}
        currentLang={currentLang}
        onConfirm={handleServiceConfirm}
      />
      <ReturnModal
        isOpen={returnModal}
        onClose={() => setReturnModal(false)}
        vehicle={selectedVehicle}
        currentLang={currentLang}
        onConfirm={handleReturnConfirm}
      />
      <ManageModal
        isOpen={manageModal}
        onClose={() => setManageModal(false)}
        vehicle={selectedVehicle}
        currentLang={currentLang}
        isAdmin={isAdmin}
        onSave={handleManageSave}
        onRequestPin={requestSensitiveAction}
        onBlock={blockVehicle}
      />
      <AddModal
        isOpen={addModal}
        onClose={() => setAddModal(false)}
        currentLang={currentLang}
        onAdd={handleAddVehicle}
      />
      <ConfirmPasswordModal
        isOpen={confirmModal}
        onClose={() => {
          setConfirmModal(false);
          setPendingAction(null);
          setConfirmError('');
        }}
        acao={pendingAction}
        erro={confirmError}
        onConfirm={confirmSensitiveAction}
      />
    </div>
  );
}
