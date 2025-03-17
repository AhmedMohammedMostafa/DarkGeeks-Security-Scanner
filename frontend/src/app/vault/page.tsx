"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Lock,
  Unlock,
  Loader2,
  Trash2,
  Shield,
  Key,
  Clock,
  Database,
} from "lucide-react";
import { AddItemDialog } from "@/components/features/vault/AddItemDialog";
import { toast } from "sonner";
import type { VaultStatus, VaultItem } from "@/types";
import { DeleteConfirmDialog } from "@/components/features/vault/DeleteConfirmDialog";
import { formatDateTime } from "@/lib/utils";

export default function VaultPage() {
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);

  // Fetch vault status
  const refreshStatus = async () => {
    try {
      const response = await fetch("/api/vault/status");
      const result = await response.json();
      if (result.success) {
        setStatus(result.data);
      }
    } catch (error) {
      console.error("Error fetching vault status:", error);
    } finally {
      setStatusLoading(false);
    }
  };

  // Fetch vault items
  const refreshItems = async () => {
    try {
      const response = await fetch("/api/vault/items");
      const result = await response.json();
      if (result.success) {
        setItems(result.data);
      }
    } catch (error) {
      console.error("Error fetching vault items:", error);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  useEffect(() => {
    if (status && !status.locked) {
      refreshItems();
    }
  }, [status]);

  const handleUnlock = async () => {
    if (!password) {
      toast.error("Password is required");
      return;
    }

    if (!status?.key && password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/vault/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          isFirstTime: !status?.key,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(result.message);
        setPassword("");
        setConfirmPassword("");
        await refreshStatus();
        await refreshItems();
      } else {
        if (result.error === "Invalid password") {
          toast.error("Incorrect password. Please try again.");
        } else {
          toast.error(result.error || "Failed to unlock vault");
        }
        setPassword("");
      }
    } catch (error) {
      console.error("Error unlocking vault:", error);
      toast.error("Failed to unlock vault. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleLock = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/vault/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();
      if (result.success) {
        toast.success(result.message);
        setItems([]);
        await refreshStatus();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error locking vault:", error);
      toast.error("Failed to lock vault");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const response = await fetch(`/api/vault/items/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Item deleted successfully");
        await refreshItems();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Failed to delete item");
    }
  };

  if (statusLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                Status
              </CardTitle>
              <Shield
                className={status?.locked ? "text-red-500" : "text-green-500"}
              />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {status?.locked ? "Locked" : "Unlocked"}
              </div>
              <p className="text-xs text-gray-400">
                {status?.itemCount || 0} items stored
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                Encryption
              </CardTitle>
              <Key className="text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {status?.encryptionType || "N/A"}
              </div>
              <p className="text-xs text-gray-400">
                {status?.key ? "Key present" : "No key"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                Last Access
              </CardTitle>
              <Clock className="text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-white">
                {status?.lastAccess
                  ? formatDateTime(status.lastAccess)
                  : "Never"}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                Items
              </CardTitle>
              <Database className="text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {status?.itemCount || 0}
              </div>
              <p className="text-xs text-gray-400">Total items in vault</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Secure Vault</h1>
            <p className="text-gray-400">
              Store and manage your sensitive information securely
            </p>
          </div>
          {status && !status.locked && (
            <Button
              variant="destructive"
              onClick={handleLock}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Lock className="h-4 w-4 mr-2" />
              )}
              Lock Vault
            </Button>
          )}
        </div>

        {status?.locked ? (
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Unlock Vault</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {!status.key && (
                  <div>
                    <Input
                      type="password"
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <p className="mt-2 text-sm text-gray-400">
                      First time setup: Create a password for your vault
                    </p>
                  </div>
                )}
                <Button
                  className="w-full"
                  onClick={handleUnlock}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Unlock className="h-4 w-4 mr-2" />
                  )}
                  {status.key ? "Unlock Vault" : "Create Vault"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <AddItemDialog onItemAdded={refreshItems} />
              <p className="text-sm text-gray-400">
                {items.length} items stored
              </p>
            </div>

            <div className="grid gap-4">
              {items.map((item) => (
                <Card
                  key={item.id}
                  className="bg-gray-800/50 border-gray-700 hover:border-purple-500/50 transition-colors"
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-medium text-white">
                      {item.name}
                    </CardTitle>
                    <DeleteConfirmDialog
                      itemName={item.name}
                      onConfirm={() => handleDeleteItem(item.id)}
                    />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-400">Type: {item.type}</p>
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-1 rounded-full bg-purple-500/10 text-purple-400"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="text-sm">
                        <span className="text-gray-400">Value: </span>
                        <span className="text-white font-mono">
                          {item.data.value}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {items.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  No items in vault. Add your first item using the button above.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
