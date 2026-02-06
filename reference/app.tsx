import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./components/ui/table";
import { Plus, Edit, Trash2, FileText, Home } from "lucide-react";
import { LandingPage } from "./components/LandingPage";
import { FundingOpportunityForm } from "./components/FundingOpportunityForm";
import { ApplicationForm } from "./components/ApplicationForm";
import { BudgetForm } from "./components/BudgetForm";
import { BudgetCodeForm } from "./components/BudgetCodeForm";
import { GrantForm } from "./components/GrantForm";
import { SubGranteeAwardForm } from "./components/SubGranteeAwardForm";
import { ContractForm } from "./components/ContractForm";
import { InvoiceForm } from "./components/InvoiceForm";
import { ComplianceForm } from "./components/ComplianceForm";
import { projectId, publicAnonKey } from './utils/supabase/info';
import { toast } from "sonner@2.0.3";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-6c78dd6b`;

interface Record {
  id: string;
  [key: string]: any;
}

type SectionType = 
  | 'funding_opportunity' 
  | 'application' 
  | 'budget' 
  | 'budget_code'
  | 'grant' 
  | 'subgrantee_award' 
  | 'contract' 
  | 'invoice' 
  | 'compliance';

const sectionConfig = {
  funding_opportunity: {
    title: "Funding Opportunities",
    description: "Manage funding opportunities and grant announcements",
    FormComponent: FundingOpportunityForm,
    displayFields: ["fundingOpportunityTitle", "fundingAgency", "applicationDeadline"],
  },
  application: {
    title: "Applications",
    description: "Track grant applications and proposals",
    FormComponent: ApplicationForm,
    displayFields: ["programArea", "estimatedTotalBudget", "reviewers"],
  },
  budget: {
    title: "Budget",
    description: "Manage budget codes and financial tracking",
    FormComponent: BudgetForm,
    displayFields: ["magicBudgetCodes", "functionalArea", "costCenter"],
  },
  budget_code: {
    title: "Budget Codes",
    description: "Manage individual budget line items",
    FormComponent: BudgetCodeForm,
    displayFields: ["projectName", "bli", "requestedAmount", "approvedAmount"],
  },
  grant: {
    title: "Grants",
    description: "Active grants and awards management",
    FormComponent: GrantForm,
    displayFields: ["approvedAwardAmount", "periodOfPerformanceStartDate", "grantAnalystPOC"],
  },
  subgrantee_award: {
    title: "Sub Grantee Awards",
    description: "Manage subrecipient awards and monitoring",
    FormComponent: SubGranteeAwardForm,
    displayFields: ["subrecipientName", "awardAmount", "reportingFrequency"],
  },
  contract: {
    title: "Contracts",
    description: "Procurement and contract management",
    FormComponent: ContractForm,
    displayFields: ["vendorName", "contractValue", "contractExecutionDate"],
  },
  invoice: {
    title: "Invoices",
    description: "Invoice processing and payment tracking",
    FormComponent: InvoiceForm,
    displayFields: ["vendor", "amountRequested", "invoiceDate"],
  },
  compliance: {
    title: "Compliance",
    description: "Compliance tracking and closeout",
    FormComponent: ComplianceForm,
    displayFields: ["name", "dateCompleted", "deliverablesCompleted"],
  },
};

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [activeSection, setActiveSection] = useState<SectionType>('funding_opportunity');
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Record | null>(null);

  useEffect(() => {
    loadRecords(activeSection);
  }, [activeSection]);

  const loadRecords = async (section: SectionType) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/${section}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load records');
      }
      
      const data = await response.json();
      setRecords(data.records || []);
    } catch (error) {
      console.error(`Error loading ${section} records:`, error);
      toast.error(`Failed to load records: ${error.message}`);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: any) => {
    try {
      const isEditing = !!editingRecord;
      const url = isEditing 
        ? `${API_BASE}/${activeSection}/${editingRecord.id}`
        : `${API_BASE}/${activeSection}`;
      
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save record');
      }

      toast.success(isEditing ? 'Record updated successfully' : 'Record created successfully');
      setDialogOpen(false);
      setEditingRecord(null);
      loadRecords(activeSection);
    } catch (error) {
      console.error(`Error saving ${activeSection} record:`, error);
      toast.error(`Failed to save record: ${error.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
      const response = await fetch(`${API_BASE}/${activeSection}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete record');
      }

      toast.success('Record deleted successfully');
      loadRecords(activeSection);
    } catch (error) {
      console.error(`Error deleting ${activeSection} record:`, error);
      toast.error(`Failed to delete record: ${error.message}`);
    }
  };

  const handleFileUpload = async (file: File): Promise<{ url: string; fileName: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload file');
    }

    const data = await response.json();
    return { url: data.url, fileName: data.fileName };
  };

  const openCreateDialog = () => {
    setEditingRecord(null);
    setDialogOpen(true);
  };

  const openEditDialog = (record: Record) => {
    setEditingRecord(record);
    setDialogOpen(true);
  };

  const config = sectionConfig[activeSection];
  const FormComponent = config.FormComponent;

  // Show landing page if user hasn't entered the system yet
  if (showLanding) {
    return <LandingPage onGetStarted={() => setShowLanding(false)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1 space-y-2">
            <h1 className="text-4xl font-bold text-gray-900">Grant Management System</h1>
            <p className="text-gray-600">Comprehensive grant lifecycle management</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowLanding(true)}
            className="flex items-center gap-2"
          >
            <Home className="size-4" />
            Home
          </Button>
        </div>

        <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as SectionType)} className="w-full">
          <TabsList className="grid w-full grid-cols-5 md:grid-cols-9 gap-1">
            <TabsTrigger value="funding_opportunity" className="text-xs md:text-sm">
              Funding
            </TabsTrigger>
            <TabsTrigger value="application" className="text-xs md:text-sm">
              Application
            </TabsTrigger>
            <TabsTrigger value="budget" className="text-xs md:text-sm">
              Budget
            </TabsTrigger>
            <TabsTrigger value="budget_code" className="text-xs md:text-sm">
              Budget Codes
            </TabsTrigger>
            <TabsTrigger value="grant" className="text-xs md:text-sm">
              Grant
            </TabsTrigger>
            <TabsTrigger value="subgrantee_award" className="text-xs md:text-sm">
              Sub Awards
            </TabsTrigger>
            <TabsTrigger value="contract" className="text-xs md:text-sm">
              Contract
            </TabsTrigger>
            <TabsTrigger value="invoice" className="text-xs md:text-sm">
              Invoice
            </TabsTrigger>
            <TabsTrigger value="compliance" className="text-xs md:text-sm">
              Compliance
            </TabsTrigger>
          </TabsList>

          {Object.keys(sectionConfig).map((section) => (
            <TabsContent key={section} value={section} className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{sectionConfig[section as SectionType].title}</CardTitle>
                      <CardDescription>{sectionConfig[section as SectionType].description}</CardDescription>
                    </div>
                    <Button onClick={openCreateDialog}>
                      <Plus className="size-4 mr-2" />
                      Add New
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8 text-gray-500">Loading...</div>
                  ) : records.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="size-12 mx-auto mb-2 text-gray-300" />
                      <p>No records found. Click "Add New" to create one.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {sectionConfig[section as SectionType].displayFields.map((field) => (
                              <TableHead key={field}>{field}</TableHead>
                            ))}
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {records.map((record) => (
                            <TableRow key={record.id}>
                              {sectionConfig[section as SectionType].displayFields.map((field) => (
                                <TableCell key={field}>
                                  {record[field] || '-'}
                                </TableCell>
                              ))}
                              <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEditDialog(record)}
                                  >
                                    <Edit className="size-4" />
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDelete(record.id)}
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRecord ? 'Edit' : 'Create New'} {config.title.slice(0, -1)}
              </DialogTitle>
            </DialogHeader>
            <FormComponent
              record={editingRecord}
              onSave={handleSave}
              onCancel={() => {
                setDialogOpen(false);
                setEditingRecord(null);
              }}
              onFileUpload={handleFileUpload}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}