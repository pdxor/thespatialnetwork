import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/supabase';
import { FileText, Download, Edit, Check, X, Sparkles, PlusCircle, FileUp, Clipboard, ClipboardCheck } from 'lucide-react';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import BusinessPlanChat from './BusinessPlanChat';

type Project = Database['public']['Tables']['projects']['Row'];
type BusinessPlan = Database['public']['Tables']['business_plans']['Row'];

export interface BusinessPlanTemplate {
  executiveSummary: {
    overview: string;
    mission: string;
    vision: string;
    objectives: string[];
    completed: boolean;
  };
  projectDescription: {
    background: string;
    permaculturePrinciples: string;
    keyFeatures: string[];
    completed: boolean;
  };
  marketAnalysis: {
    targetMarket: string;
    competition: string;
    trends: string;
    opportunities: string;
    completed: boolean;
  };
  productsAndServices: {
    description: string;
    pricing: string;
    uniqueSellingPoints: string;
    completed: boolean;
  };
  operatingPlan: {
    location: string;
    facilities: string;
    equipment: string;
    timeline: string;
    completed: boolean;
  };
  marketingStrategy: {
    overview: string;
    channels: string[];
    partnerships: string;
    promotions: string;
    completed: boolean;
  };
  financialPlan: {
    startupCosts: string;
    operatingExpenses: string;
    revenueProjections: string;
    fundingSources: string;
    breakEvenAnalysis: string;
    completed: boolean;
  };
  implementationTimeline: {
    phases: {
      name: string;
      description: string;
      duration: string;
    }[];
    milestones: string[];
    completed: boolean;
  };
  riskAnalysis: {
    potentialRisks: string[];
    mitigationStrategies: string;
    contingencyPlans: string;
    completed: boolean;
  };
  conclusion: {
    summary: string;
    nextSteps: string;
    completed: boolean;
  };
}

interface BusinessPlanGeneratorProps {
  project: Project;
  visible: boolean;
}

const BusinessPlanGenerator: React.FC<BusinessPlanGeneratorProps> = ({ project, visible }) => {
  const [businessPlan, setBusinessPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [planTemplate, setPlanTemplate] = useState<BusinessPlanTemplate | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualEntryContent, setManualEntryContent] = useState('');

  // Initialize or fetch business plan
  useEffect(() => {
    if (!project.id || !visible) return;
    
    const fetchBusinessPlan = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('business_plans')
          .select('*')
          .eq('project_id', project.id)
          .maybeSingle();
          
        if (error) throw error;
        
        if (data) {
          setBusinessPlan(data.content);
          
          // Try to parse as JSON to see if it's a template
          try {
            const parsed = JSON.parse(data.content);
            if (parsed.executiveSummary) {
              setPlanTemplate(parsed);
            }
          } catch (e) {
            // Not JSON, just use as text
            console.log('Business plan is not in template format');
          }
        } else {
          // Initialize a new template
          const newTemplate = createEmptyTemplate();
          setPlanTemplate(newTemplate);
        }
      } catch (err) {
        console.error('Error fetching business plan:', err);
        setError('Failed to load business plan');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBusinessPlan();
  }, [project.id, visible]);

  const createEmptyTemplate = (): BusinessPlanTemplate => {
    return {
      executiveSummary: {
        overview: '',
        mission: '',
        vision: '',
        objectives: [],
        completed: false
      },
      projectDescription: {
        background: '',
        permaculturePrinciples: '',
        keyFeatures: [],
        completed: false
      },
      marketAnalysis: {
        targetMarket: '',
        competition: '',
        trends: '',
        opportunities: '',
        completed: false
      },
      productsAndServices: {
        description: '',
        pricing: '',
        uniqueSellingPoints: '',
        completed: false
      },
      operatingPlan: {
        location: '',
        facilities: '',
        equipment: '',
        timeline: '',
        completed: false
      },
      marketingStrategy: {
        overview: '',
        channels: [],
        partnerships: '',
        promotions: '',
        completed: false
      },
      financialPlan: {
        startupCosts: '',
        operatingExpenses: '',
        revenueProjections: '',
        fundingSources: '',
        breakEvenAnalysis: '',
        completed: false
      },
      implementationTimeline: {
        phases: [],
        milestones: [],
        completed: false
      },
      riskAnalysis: {
        potentialRisks: [],
        mitigationStrategies: '',
        contingencyPlans: '',
        completed: false
      },
      conclusion: {
        summary: '',
        nextSteps: '',
        completed: false
      }
    };
  };

  const handleSaveBusinessPlan = async (content: string) => {
    if (!project.id) return;
    
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('business_plans')
        .select('id')
        .eq('project_id', project.id)
        .maybeSingle();
        
      if (error) throw error;
      
      if (data) {
        // Update existing plan
        const { error: updateError } = await supabase
          .from('business_plans')
          .update({ content })
          .eq('id', data.id);
          
        if (updateError) throw updateError;
      } else {
        // Create new plan
        const { error: insertError } = await supabase
          .from('business_plans')
          .insert({ project_id: project.id, content });
          
        if (insertError) throw insertError;
      }
      
      setBusinessPlan(content);
      
      // Try to parse as JSON to see if it's a template
      try {
        const parsed = JSON.parse(content);
        if (parsed.executiveSummary) {
          setPlanTemplate(parsed);
        }
      } catch (e) {
        // Not JSON, just use as text
        console.log('Saved business plan is not in template format');
      }
      
    } catch (err) {
      console.error('Error saving business plan:', err);
      setError('Failed to save business plan');
    } finally {
      setSaving(false);
      setEditMode(false);
    }
  };

  const handleDownloadBusinessPlan = async () => {
    if (!businessPlan) return;
    
    try {
      // Create a new document
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                text: `${project.title}: Business Plan`,
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                text: `Generated on ${new Date().toLocaleDateString()}`,
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                text: '',
              }),
              ...generateDocxContent(businessPlan)
            ],
          },
        ],
      });
      
      // Generate the document as a blob
      const blob = await Packer.toBlob(doc);
      
      // Save the blob as a file
      saveAs(blob, `${project.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_business_plan.docx`);
      
    } catch (err) {
      console.error('Error generating DOCX:', err);
      setError('Failed to generate document');
    }
  };

  const generateDocxContent = (content: string) => {
    // Try to parse as JSON template
    try {
      const template = JSON.parse(content) as BusinessPlanTemplate;
      
      const paragraphs: Paragraph[] = [];
      
      // Executive Summary
      paragraphs.push(
        new Paragraph({
          text: 'Executive Summary',
          heading: HeadingLevel.HEADING_1,
        })
      );
      
      if (template.executiveSummary.overview) {
        paragraphs.push(
          new Paragraph({
            text: template.executiveSummary.overview,
          })
        );
      }
      
      if (template.executiveSummary.mission) {
        paragraphs.push(
          new Paragraph({
            text: 'Mission',
            heading: HeadingLevel.HEADING_2,
          })
        );
        paragraphs.push(
          new Paragraph({
            text: template.executiveSummary.mission,
          })
        );
      }
      
      if (template.executiveSummary.vision) {
        paragraphs.push(
          new Paragraph({
            text: 'Vision',
            heading: HeadingLevel.HEADING_2,
          })
        );
        paragraphs.push(
          new Paragraph({
            text: template.executiveSummary.vision,
          })
        );
      }
      
      if (template.executiveSummary.objectives.length > 0) {
        paragraphs.push(
          new Paragraph({
            text: 'Objectives',
            heading: HeadingLevel.HEADING_2,
          })
        );
        
        template.executiveSummary.objectives.forEach(objective => {
          paragraphs.push(
            new Paragraph({
              text: `• ${objective}`,
            })
          );
        });
      }
      
      // Add other sections similarly...
      // Project Description
      paragraphs.push(
        new Paragraph({
          text: 'Project Description',
          heading: HeadingLevel.HEADING_1,
        })
      );
      
      if (template.projectDescription.background) {
        paragraphs.push(
          new Paragraph({
            text: template.projectDescription.background,
          })
        );
      }
      
      // Continue with other sections...
      
      return paragraphs;
      
    } catch (e) {
      // Not a template, just split by newlines
      return content.split('\n').map(line => 
        new Paragraph({
          children: [new TextRun(line)],
        })
      );
    }
  };

  const handleEditPlan = () => {
    setEditMode(true);
    setEditContent(businessPlan || '');
  };

  const handleCancelEdit = () => {
    setEditMode(false);
  };

  const handleSaveEdit = () => {
    handleSaveBusinessPlan(editContent);
  };

  const handleOpenChat = (section: string | null = null) => {
    setActiveSection(section);
    setShowChat(true);
  };

  const handleUpdatePlan = async (newContent: string) => {
    return handleSaveBusinessPlan(newContent);
  };

  const calculateCompletionPercentage = () => {
    if (!planTemplate) return 0;
    
    const sections = Object.keys(planTemplate);
    const completedSections = sections.filter(section => 
      planTemplate[section as keyof BusinessPlanTemplate].completed
    );
    
    return Math.round((completedSections.length / sections.length) * 100);
  };

  const formatSectionTitle = (key: string) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  };

  const handleManualEntry = () => {
    setShowManualEntry(true);
    setManualEntryContent(businessPlan || '');
  };

  const handleSaveManualEntry = () => {
    handleSaveBusinessPlan(manualEntryContent);
    setShowManualEntry(false);
  };

  const handleCancelManualEntry = () => {
    setShowManualEntry(false);
  };

  const handleCopyToClipboard = () => {
    if (businessPlan) {
      navigator.clipboard.writeText(businessPlan);
    }
  };

  if (!visible) return null;

  if (loading) {
    return (
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-300">Loading business plan...</span>
        </div>
      </div>
    );
  }

  if (showManualEntry) {
    return (
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <FileText className="h-6 w-6 mr-2 text-blue-600 dark:text-blue-400" />
            Manual Business Plan Entry
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={handleSaveManualEntry}
              className="bg-green-600 dark:bg-green-700 text-white px-3 py-1 rounded hover:bg-green-700 dark:hover:bg-green-600 flex items-center text-sm"
            >
              <Check className="h-4 w-4 mr-1" />
              Save
            </button>
            <button
              onClick={handleCancelManualEntry}
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center text-sm"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </button>
          </div>
        </div>
        
        <div className="mb-4">
          <textarea
            value={manualEntryContent}
            onChange={(e) => setManualEntryContent(e.target.value)}
            className="w-full h-96 p-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            placeholder="Enter your business plan content here..."
          />
        </div>
        
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <p>Enter your complete business plan text. This will replace any existing content.</p>
        </div>
      </div>
    );
  }

  if (editMode) {
    return (
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <FileText className="h-6 w-6 mr-2 text-blue-600 dark:text-blue-400" />
            Edit Business Plan
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={handleSaveEdit}
              className="bg-green-600 dark:bg-green-700 text-white px-3 py-1 rounded hover:bg-green-700 dark:hover:bg-green-600 flex items-center text-sm"
              disabled={saving}
            >
              {saving ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-1 border-2 border-white border-t-transparent rounded-full"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Save
                </>
              )}
            </button>
            <button
              onClick={handleCancelEdit}
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center text-sm"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </button>
          </div>
        </div>
        
        <div className="mb-4">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full h-96 p-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>
      </div>
    );
  }

  return (
    <>
      {showChat && (
        <BusinessPlanChat
          projectId={project.id}
          currentPlan={businessPlan}
          onUpdatePlan={handleUpdatePlan}
          activeSection={activeSection}
          onClose={() => setShowChat(false)}
        />
      )}
      
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mr-4">
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Business Plan Generator</h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Create a comprehensive business plan for your permaculture project
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleOpenChat()}
              className="bg-purple-600 dark:bg-purple-700 text-white px-3 py-1.5 rounded hover:bg-purple-700 dark:hover:bg-purple-600 flex items-center text-sm shadow-sm"
            >
              <Sparkles className="h-4 w-4 mr-1.5" />
              AI Assistant
            </button>
            
            <button
              onClick={handleManualEntry}
              className="bg-green-600 dark:bg-green-700 text-white px-3 py-1.5 rounded hover:bg-green-700 dark:hover:bg-green-600 flex items-center text-sm shadow-sm"
            >
              <PlusCircle className="h-4 w-4 mr-1.5" />
              Manual Entry
            </button>
            
            {businessPlan && (
              <>
                <button
                  onClick={handleEditPlan}
                  className="bg-blue-600 dark:bg-blue-700 text-white px-3 py-1.5 rounded hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center text-sm shadow-sm"
                >
                  <Edit className="h-4 w-4 mr-1.5" />
                  Edit
                </button>
                
                <button
                  onClick={handleDownloadBusinessPlan}
                  className="bg-gray-600 dark:bg-gray-700 text-white px-3 py-1.5 rounded hover:bg-gray-700 dark:hover:bg-gray-600 flex items-center text-sm shadow-sm"
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  Download
                </button>
                
                <button
                  onClick={handleCopyToClipboard}
                  className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded hover:bg-gray-300 dark:hover:bg-gray-500 flex items-center text-sm"
                >
                  <Clipboard className="h-4 w-4 mr-1.5" />
                  Copy
                </button>
              </>
            )}
          </div>
        </div>
        
        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-600 text-red-700 dark:text-red-300 p-4 rounded-md mb-6">
            {error}
          </div>
        )}
        
        {planTemplate ? (
          <div>
            <div className="mb-6 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100">Business Plan Completion</h3>
                <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">{calculateCompletionPercentage()}% Complete</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full" 
                  style={{ width: `${calculateCompletionPercentage()}%` }}
                ></div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {Object.keys(planTemplate).map((section) => {
                const sectionData = planTemplate[section as keyof BusinessPlanTemplate];
                const isCompleted = sectionData.completed;
                
                return (
                  <div 
                    key={section}
                    className={`p-4 rounded-lg border ${
                      isCompleted 
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                        : 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium text-gray-800 dark:text-gray-100">{formatSectionTitle(section)}</h3>
                      {isCompleted ? (
                        <span className="text-xs bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-0.5 rounded-full flex items-center">
                          <Check className="h-3 w-3 mr-1" />
                          Completed
                        </span>
                      ) : (
                        <span className="text-xs bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                          Not Started
                        </span>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleOpenChat(section)}
                      className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center"
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-1" />
                      {isCompleted ? 'Edit with AI' : 'Generate with AI'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : businessPlan ? (
          <div className="prose dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-700/30 p-6 rounded-lg border border-gray-200 dark:border-gray-700 max-h-[500px] overflow-y-auto">
              {businessPlan}
            </div>
          </div>
        ) : (
          <div className="text-center py-10 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700 border-dashed">
            <FileText className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">No Business Plan Yet</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
              Create a comprehensive business plan for your permaculture project using our AI assistant or manual entry.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => handleOpenChat()}
                className="inline-flex items-center px-4 py-2 bg-purple-600 dark:bg-purple-700 text-white rounded-md hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors shadow-sm"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Generate with AI
              </button>
              <button
                onClick={handleManualEntry}
                className="inline-flex items-center px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-600 transition-colors shadow-sm"
              >
                <PlusCircle className="h-5 w-5 mr-2" />
                Manual Entry
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default BusinessPlanGenerator;