"use client";

import { useNavigation } from "@/contexts/NavigationContext";
import { TopNavigation } from "@/components/ui/top-navigation";
import { Sidebar } from "@/components/ui/sidebar";
import { NavigationProgress } from "@/components/ui/LoadingScreen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestNavigationPage() {
  const { 
    currentProjectId, 
    userId, 
    navigateTo, 
    getProjectPath, 
    getUserPath,
    setCurrentProjectId,
    setUserId
  } = useNavigation();

  const handleTestNavigate = (destination: string) => {
    const path = destination.includes('work') ? getUserPath('work') : getProjectPath(destination);
    navigateTo(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationProgress />
      <TopNavigation />
      <div className="flex">
        <Sidebar projectId={currentProjectId || undefined} />
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Navigation Test Page</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Current State</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <strong>Project ID:</strong> {currentProjectId || 'None selected'}
                    </div>
                    <div>
                      <strong>User ID:</strong> {userId || 'None selected'}
                    </div>
                    <div>
                      <strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.pathname + window.location.search : 'N/A'}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Setup</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Test Project ID:</label>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setCurrentProjectId('test-project-1')}
                        >
                          Set Test Project 1
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setCurrentProjectId('test-project-2')}
                        >
                          Set Test Project 2
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Test User ID:</label>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setUserId('test-user-123')}
                      >
                        Set Test User
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Navigation Test</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Button 
                    onClick={() => handleTestNavigate('summary')}
                    disabled={!currentProjectId}
                    className="w-full"
                  >
                    📊 Summary
                  </Button>
                  
                  <Button 
                    onClick={() => handleTestNavigate('board')}
                    disabled={!currentProjectId}
                    className="w-full"
                  >
                    📋 Board
                  </Button>
                  
                  <Button 
                    onClick={() => handleTestNavigate('backlog')}
                    disabled={!currentProjectId}
                    className="w-full"
                  >
                    📝 Backlog
                  </Button>
                  
                  <Button 
                    onClick={() => handleTestNavigate('calendar')}
                    disabled={!currentProjectId}
                    className="w-full"
                  >
                    📅 Calendar
                  </Button>
                  
                  <Button 
                    onClick={() => handleTestNavigate('work')}
                    disabled={!userId}
                    className="w-full"
                  >
                    💼 All Work
                  </Button>
                  
                  <Button 
                    onClick={() => navigateTo('/test-navigation')}
                    variant="outline"
                    className="w-full"
                  >
                    🔄 Reload Test
                  </Button>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">Test Instructions:</h3>
                  <ol className="text-sm text-blue-800 space-y-1">
                    <li>1. Set a test project ID using the buttons above</li>
                    <li>2. Click on any navigation button to test smooth transitions</li>
                    <li>3. Notice the navigation progress bar at the top</li>
                    <li>4. Try switching between different pages quickly</li>
                    <li>5. Check that projectId and userId are preserved</li>
                  </ol>
                </div>

                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <h3 className="font-medium text-green-900 mb-2">Expected Behavior:</h3>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Navigation should be instant with progress bar</li>
                    <li>• State should be preserved between pages</li>
                    <li>• Sidebar should stay in sync and highlight active page</li>
                    <li>• URL parameters should be maintained</li>
                    <li>• localStorage should persist data</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
} 