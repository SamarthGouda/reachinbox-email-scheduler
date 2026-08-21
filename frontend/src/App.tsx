import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext.js';
import { LoginView } from './components/auth/LoginView.js';
import { Sidebar } from './components/dashboard/Sidebar.js';
import { Header } from './components/dashboard/Header.js';
import { EmailList } from './components/dashboard/EmailList.js';
import { EmailDetailModal } from './components/dashboard/EmailDetailModal.js';
import { ComposeModal } from './components/compose/ComposeModal.js';
import { LoadingSpinner } from './components/ui/LoadingSpinner.js';
import { EmptyState } from './components/ui/EmptyState.js';
import { emailApi } from './services/api.js';
import { Email, EmailStats } from './types/index.js';

export const App: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [currentView, setCurrentView] = useState<'list' | 'compose' | 'detail'>('list');
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  const [emails, setEmails] = useState<Email[]>([]);
  const [stats, setStats] = useState<EmailStats>({ scheduled: 0, sent: 0, failed: 0, total: 0 });
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await emailApi.getEmailStats();
      setStats(data);
    } catch (err) {
      console.warn('Failed to fetch stats:', err);
    }
  };

  const fetchEmails = useCallback(async () => {
    if (!user) return;
    setIsLoadingEmails(true);
    try {
      if (activeTab === 'scheduled') {
        const data = await emailApi.getScheduledEmails(1, 50, searchQuery);
        setEmails(data.emails);
      } else {
        const data = await emailApi.getSentEmails(1, 50, searchQuery);
        setEmails(data.emails);
      }
      await fetchStats();
    } catch (err) {
      console.error('Failed to load emails:', err);
    } finally {
      setIsLoadingEmails(false);
      setIsRefreshing(false);
    }
  }, [user, activeTab, searchQuery]);

  useEffect(() => {
    if (user) {
      fetchEmails();
      // Poll every 5 seconds for status updates
      const interval = setInterval(fetchEmails, 5000);
      return () => clearInterval(interval);
    }
  }, [user, fetchEmails]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchEmails();
  };

  const handleTabChange = (tab: 'scheduled' | 'sent') => {
    setActiveTab(tab);
    setCurrentView('list');
    setSelectedEmail(null);
  };

  const handleComposeClick = () => {
    setCurrentView('compose');
    setSelectedEmail(null);
  };

  const handleSelectEmail = (email: Email) => {
    setSelectedEmail(email);
    setCurrentView('detail');
  };

  const handleComposeSuccess = () => {
    setCurrentView('list');
    fetchEmails();
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <LoadingSpinner size="lg" text="Loading ReachInbox..." />
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onComposeClick={handleComposeClick}
        scheduledCount={stats.scheduled}
        sentCount={stats.sent}
      />

      {/* Main View Container */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {currentView === 'compose' ? (
          <ComposeModal
            onClose={() => setCurrentView('list')}
            onSuccess={handleComposeSuccess}
          />
        ) : currentView === 'detail' && selectedEmail ? (
          <EmailDetailModal
            email={selectedEmail}
            onBack={() => {
              setSelectedEmail(null);
              setCurrentView('list');
            }}
          />
        ) : (
          <>
            {/* Header */}
            <Header
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
            />

            {/* Email Table / List Area */}
            <div className="flex-1 overflow-y-auto">
              {isLoadingEmails && emails.length === 0 ? (
                <LoadingSpinner size="md" text="Fetching emails..." />
              ) : emails.length === 0 ? (
                <EmptyState
                  type={searchQuery ? 'search' : activeTab}
                  onCompose={handleComposeClick}
                />
              ) : (
                <EmailList
                  emails={emails}
                  type={activeTab}
                  onSelectEmail={handleSelectEmail}
                />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};
