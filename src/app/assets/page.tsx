
"use client";

import { useState, useEffect, ChangeEvent, useMemo } from "react";
import { useForm, FormProvider, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Asset, AssetStatus, AssetContentType } from "@/lib/firebase/firestoreService";
import { DUMMY_ASSETS } from "@/lib/dummy-data";
import { analyzeAsset, type AssetAnalysisOutput, analyzeBrandSafety, type BrandSafetyOutput } from "@/ai";
import { LoaderCircle, CheckCircle, FileEdit, AlertTriangle, Search, ListFilter, PlusCircle, Lightbulb, Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type CombinedAnalysisData = AssetAnalysisOutput & BrandSafetyOutput;

const getStatusVariant = (status?: AssetStatus) => {
  switch (status) {
    case "Picked Up":
      return "default";
    case "Approved":
    case "Ready for Publisher":
      return "secondary";
    case "In Review":
    case "New":
      return "outline";
    case "Rejected":
      return "destructive";
    default:
      return "outline";
  }
};

const getScoreVariant = (score?: number): { variant: "default" | "secondary" | "destructive"; className: string } => {
  if (score === undefined) return { variant: "secondary", className: "" };
  if (score > 75) return { variant: "default", className: "bg-green-500/20 text-green-700 border-green-500/30" };
  if (score >= 50) return { variant: "secondary", className: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30" };
  return { variant: "destructive", className: "bg-red-500/20 text-red-700 border-red-500/30" };
};


const ALL_CONTENT_TYPES: AssetContentType[] = ['Branded', 'Endorsed', 'UGC', 'Mixed', 'N/A'];
const ALL_STATUSES: AssetStatus[] = ['New', 'In Review', 'Approved', 'Rejected', 'Ready for Publisher', 'Picked Up'];


const CopyableId = ({ id }: { id: string }) => {
    const [copied, setCopied] = useState(false);
    
    const handleCopy = () => {
        navigator.clipboard.writeText(id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <TooltipProvider>
            <Tooltip open={copied ? true : undefined}>
                <TooltipTrigger asChild>
                    <button onClick={handleCopy} className="group flex items-center gap-2 text-left">
                        <span className="font-mono text-xs text-muted-foreground group-hover:text-foreground">{id.substring(0, 8)}...</span>
                        {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground group-hover:text-foreground" />}
                    </button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Copied!</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};


export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isAnalysisDialogOpen, setIsAnalysisDialogOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilters, setStatusFilters] = useState<AssetStatus[]>([]);
  const [contentTypeFilters, setContentTypeFilters] = useState<AssetContentType[]>([]);
  const [statusSearch, setStatusSearch] = useState("");
  const [contentTypeSearch, setContentTypeSearch] = useState("");
  
  const methods = useForm<CombinedAnalysisData & {manualData: any}>();

  useEffect(() => {
    setAssets(DUMMY_ASSETS);
  }, []);

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const searchTermLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm ? 
        (asset.name?.toLowerCase().includes(searchTermLower) || asset.contentSnId.toLowerCase().includes(searchTermLower))
        : true;
      const matchesStatus = statusFilters.length > 0 ? asset.status && statusFilters.includes(asset.status) : true;
      const matchesContentType = contentTypeFilters.length > 0 ? asset.contentType && contentTypeFilters.includes(asset.contentType) : true;
      return matchesSearch && matchesStatus && matchesContentType;
    });
  }, [assets, searchTerm, statusFilters, contentTypeFilters]);


  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsAnalyzing(true);
    setIsAnalysisDialogOpen(true);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUri = reader.result as string;
      setPreview(dataUri);
      
      try {
        const [brandSafetyResult, analysisResult] = await Promise.all([
           analyzeBrandSafety({ media: dataUri }),
           analyzeAsset({ media: dataUri })
        ]);
        
        methods.reset({
          ...analysisResult,
          ...brandSafetyResult,
          manualData: {
            campaignName: "New Campaign",
          }
        });

      } catch (error) {
        console.error("Error analyzing asset:", error);
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (data: any) => {
    if (!selectedFile) return;

    const finalData = methods.getValues();

    const newAsset: Asset = {
      id: `new-${Date.now()}`,
      name: selectedFile.name,
      creator: finalData.manualData.creativeAgencyName || 'N/A',
      type: selectedFile.type.startsWith('video') ? 'Video' : selectedFile.type.startsWith('image') ? 'Image' : 'Audio',
      length: 'N/A', 
      tags: "AI Analyzed",
      campaign: finalData.manualData.campaignName || 'New Campaign',
      creationDate: new Date().toISOString().split('T')[0],
      contentSnId: `NEW-ASSET-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      daypart: 'N/A',
      spotLength: 'N/A',
      parentCompany: finalData.parentCompany,
      brand: finalData.brand,
      product: finalData.product,
      brandSafety: finalData.brandSafety,
      status: 'New',
      contentType: 'Branded',
      thumbnail: preview || 'https://placehold.co/40x40.png'
    };
    
    setAssets(prevAssets => [newAsset, ...prevAssets]);
    resetAndCloseDialogs();
  };
  
  const resetAndCloseDialogs = () => {
    setIsAnalysisDialogOpen(false);
    setSelectedFile(null);
    setPreview(null);
    setIsAnalyzing(false);
    methods.reset();
  };

  const handleContentTypeFilterChange = (contentType: AssetContentType) => {
    setContentTypeFilters(prev => 
      prev.includes(contentType) 
        ? prev.filter(item => item !== contentType) 
        : [...prev, contentType]
    );
  };

  const handleStatusFilterChange = (status: AssetStatus) => {
    setStatusFilters(prev => 
      prev.includes(status) 
        ? prev.filter(item => item !== status) 
        : [...prev, status]
    );
  };

  const renderFeatureWithOverride = (
    label: string, 
    baseName: any,
    options: {type: 'select-boolean' | 'select-string' | 'slider', values?: string[]}
  ) => {
    const name = `${baseName}.determination` as const;
    const aiReasoning = methods.getValues(baseName as any)?.reasoning;
    const aiConfidence = methods.getValues(baseName as any)?.confidenceScore;

    return (
        <div className="text-sm space-y-2 rounded-md border p-3">
            <div className="flex justify-between items-center">
                <Label htmlFor={name} className="font-medium text-foreground/90">{label}</Label>
                <div className="w-48">
                <Controller
                    name={name as any}
                    control={methods.control}
                    render={({ field }) => {
                       if (options.type === 'select-boolean') {
                           return (
                               <Select onValueChange={(val) => field.onChange(val === 'true')} value={String(field.value)}>
                                   <SelectTrigger id={name}><SelectValue /></SelectTrigger>
                                   <SelectContent><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></SelectContent>
                               </Select>
                           );
                       }
                       if (options.type === 'select-string' && options.values) {
                           return (
                               <Select onValueChange={field.onChange} value={field.value}>
                                   <SelectTrigger id={name}><SelectValue /></SelectTrigger>
                                   <SelectContent>
                                       {options.values.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                                   </SelectContent>
                               </Select>
                           )
                       }
                       if (options.type === 'slider') {
                           return (
                               <div className="flex items-center gap-2">
                                   <Slider id={name} min={1} max={5} step={1} value={[field.value]} onValueChange={(v) => field.onChange(v[0])} />
                                   <Badge variant="secondary" className="w-8 justify-center">{field.value}</Badge>
                               </div>
                           )
                       }
                       return <Input {...field} />;
                    }}
                />
                </div>
            </div>
            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md space-y-1">
                <p><span className="font-semibold">AI Reasoning:</span> {aiReasoning}</p>
                 {aiConfidence && (
                    <div className="flex items-center gap-2">
                        <Label className="text-xs">AI Confidence:</Label>
                        <Progress value={aiConfidence * 100} className="h-1.5 w-24" />
                        <span className="font-mono">{(aiConfidence * 100).toFixed(0)}%</span>
                    </div>
                )}
            </div>
        </div>
    );
  };


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Asset Library</h2>
         <div className="flex items-center gap-2">
            <Button asChild>
                <Label htmlFor="asset-upload" className="cursor-pointer">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Upload Asset
                </Label>
            </Button>
            <Input id="asset-upload" type="file" accept="image/*,video/*,audio/*" onChange={handleFileChange} className="hidden" />
        </div>
      </div>

      <Dialog open={isAnalysisDialogOpen} onOpenChange={(isOpen) => {
          if (!isOpen) resetAndCloseDialogs();
           setIsAnalysisDialogOpen(isOpen);
      }}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
             <FormProvider {...methods}>
              <form onSubmit={methods.handleSubmit(handleSave)}>
                  <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                          <FileEdit className="h-6 w-6 text-primary" />
                          Review & Finalize Analysis
                      </DialogTitle>
                      <DialogDescription>
                          The AI has performed a first-pass analysis. Review and override any values below before saving the asset.
                      </DialogDescription>
                  </DialogHeader>

                  <div className="py-4 pr-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 space-y-4">
                        <h3 className="text-lg font-semibold">Asset Context</h3>
                        {preview && (
                            <Card>
                                <CardContent className="p-2">
                                    {selectedFile?.type.startsWith('video') ? (
                                        <video muted controls src={preview} className="w-full rounded-md" />
                                    ) : selectedFile?.type.startsWith('image') ? (
                                        <img src={preview} alt="Preview" className="w-full rounded-md" />
                                    ) : (
                                        <div className="h-40 rounded bg-muted flex items-center justify-center">Audio File</div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                        <Card>
                          <CardContent className="pt-6 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="parentCompany">Parent Company</Label>
                                <Controller name="parentCompany" control={methods.control} render={({field}) => <Input {...field} />}/>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="brand">Brand</Label>
                                <Controller name="brand" control={methods.control} render={({field}) => <Input {...field} />}/>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="product">Product</Label>
                                <Controller name="product" control={methods.control} render={({field}) => <Input {...field} />}/>
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6 space-y-4">
                             <div className="space-y-2">
                                <Label htmlFor="campaignName">Campaign Name</Label>
                                <Controller name="manualData.campaignName" control={methods.control} render={({field}) => <Input {...field} />}/>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="creativeAgencyName">Creative Agency</Label>
                                <Controller name="manualData.creativeAgencyName" control={methods.control} render={({field}) => <Input {...field} />}/>
                            </div>
                             <div className="space-y-2">
                                <Label>Endorsement Type</Label>
                                 <Controller name="manualData.endorsementType" control={methods.control} render={({field}) => (
                                     <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="host-read">Host-Read</SelectItem>
                                            <SelectItem value="producer-read">Producer-Read</SelectItem>
                                            <SelectItem value="brand-voiced">Brand-Voiced</SelectItem>
                                            <SelectItem value="actor-voiced">Actor-Voiced</SelectItem>
                                            <SelectItem value="influencer">Influencer</SelectItem>
                                            <SelectItem value="none">None</SelectItem>
                                        </SelectContent>
                                    </Select>
                                 )} />
                            </div>
                             <div className="space-y-2">
                                <Label>Narrator Type</Label>
                                 <Controller name="manualData.narratorType" control={methods.control} render={({field}) => (
                                     <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="celebrity">Celebrity</SelectItem>
                                            <SelectItem value="voice-actor">Voice Actor</SelectItem>
                                            <SelectItem value="host">Host</SelectItem>
                                            <SelectItem value="brand-rep">Brand Representative</SelectItem>
                                            <SelectItem value="customer">Customer</SelectItem>
                                            <SelectItem value="none">None</SelectItem>
                                        </SelectContent>
                                    </Select>
                                 )}/>
                            </div>
                          </CardContent>
                        </Card>
                    </div>

                    <div className="md:col-span-2 space-y-4">
                        <h3 className="text-lg font-semibold">AI Qualitative Analysis</h3>
                        {isAnalyzing ? (
                            <div className="flex items-center justify-center h-full">
                               <LoaderCircle className="mr-2 h-6 w-6 animate-spin" />
                               <span>Analyzing...</span>
                            </div>
                        ) : (
                          <Accordion type="multiple" defaultValue={['messageStrategy', 'execution', 'emotionalImpact', 'performance']} className="w-full">
                              <AccordionItem value="messageStrategy">
                                  <AccordionTrigger>Message Strategy</AccordionTrigger>
                                  <AccordionContent className="space-y-4">
                                      {renderFeatureWithOverride("Single Message Focus", "analysis.messageStrategy.hasSingleMessageFocus", {type: 'select-boolean'})}
                                      {renderFeatureWithOverride("Message Complexity", "analysis.messageStrategy.messageComplexity", {type: 'select-string', values: ['Simple', 'Moderate', 'Complex']})}
                                      {renderFeatureWithOverride("Uses 'Right Brain' Elements", "analysis.messageStrategy.usesRightBrainElements", {type: 'select-boolean'})}
                                  </AccordionContent>
                              </AccordionItem>
                               <AccordionItem value="execution">
                                  <AccordionTrigger>Execution</AccordionTrigger>
                                  <AccordionContent className="space-y-4">
                                      {renderFeatureWithOverride("Music Prominently Featured", "analysis.execution.musicProminentlyFeatured", {type: 'select-boolean'})}
                                      {renderFeatureWithOverride("Is Emotional Storytelling", "analysis.execution.isEmotionalStorytelling", {type: 'select-boolean'})}
                                      {renderFeatureWithOverride("Uses Humor", "analysis.execution.usesHumor", {type: 'select-boolean'})}
                                      {renderFeatureWithOverride("Pacing", "analysis.execution.pacing", {type: 'select-string', values: ['Slow', 'Appropriate', 'Rushed', 'Not Applicable']})}
                                  </AccordionContent>
                              </AccordionItem>
                              <AccordionItem value="emotionalImpact">
                                  <AccordionTrigger>Emotional Impact</AccordionTrigger>
                                  <AccordionContent className="space-y-4">
                                      {renderFeatureWithOverride("Is Emotion-Driven", "analysis.emotionalImpact.isEmotionDriven", {type: 'select-boolean'})}
                                      {renderFeatureWithOverride("Primary Emotion", "analysis.emotionalImpact.primaryEmotion", {type: 'select-string', values: ['Happiness', 'Trust', 'Urgency', 'Nostalgia', 'Surprise', 'Fear', 'Anger', 'Sadness', 'Neutral']})}
                                      {renderFeatureWithOverride("Has Positive Tone", "analysis.emotionalImpact.hasPositiveTone", {type: 'select-boolean'})}
                                  </AccordionContent>
                              </AccordionItem>
                               <AccordionItem value="performance">
                                  <AccordionTrigger>Performance Potential</AccordionTrigger>
                                  <AccordionContent className="space-y-4">
                                      {renderFeatureWithOverride("Attention-Grabbing Intro", "analysis.performance.hasAttentionGrabbingIntro", {type: 'select-boolean'})}
                                      {renderFeatureWithOverride("Creative Novelty", "analysis.performance.creativeNovelty", {type: 'select-string', values: ['Formulaic', 'Original', 'Highly Novel']})}
                                      {renderFeatureWithOverride("Brand Fit Score (1-5)", "analysis.performance.brandFitScore", {type: 'slider'})}
                                      {renderFeatureWithOverride("Target Audience Alignment (1-5)", "analysis.performance.targetAudienceAlignmentScore", {type: 'slider'})}
                                      {renderFeatureWithOverride("Has Clear Call To Action", "analysis.performance.hasClearCallToAction", {type: 'select-string', values: ['Clear', 'Vague', 'None']})}
                                  </AccordionContent>
                              </AccordionItem>
                          </Accordion>
                        )}
                    </div>
                  </div>

                  <DialogFooter>
                      <Button type="button" variant="outline" onClick={resetAndCloseDialogs}>Cancel</Button>
                      <Button type="submit" disabled={isAnalyzing}>
                        {isAnalyzing ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save Asset
                      </Button>
                  </DialogFooter>
              </form>
            </FormProvider>
          </DialogContent>
      </Dialog>


      <Card>
        <CardHeader>
          <CardTitle>Asset Library</CardTitle>
          <CardDescription>
            Browse, search, and manage your content assets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search by name or ID..."
                    className="w-full rounded-lg bg-background pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-auto">
                           Content Type
                            {contentTypeFilters.length > 0 && <Badge variant="secondary" className="ml-2">{contentTypeFilters.length}</Badge>}
                            <ListFilter className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                        <div className="p-2">
                            <Input 
                                placeholder="Search types..." 
                                value={contentTypeSearch} 
                                onChange={(e) => setContentTypeSearch(e.target.value)}
                                className="h-8"
                            />
                        </div>
                        <DropdownMenuSeparator />
                        {ALL_CONTENT_TYPES.filter(ct => ct.toLowerCase().includes(contentTypeSearch.toLowerCase())).map((ct) => (
                            <DropdownMenuCheckboxItem
                                key={ct}
                                checked={contentTypeFilters.includes(ct)}
                                onCheckedChange={() => handleContentTypeFilterChange(ct)}
                            >
                                {ct}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                       <Button variant="outline" className="w-full sm:w-auto">
                           Status
                           {statusFilters.length > 0 && <Badge variant="secondary" className="ml-2">{statusFilters.length}</Badge>}
                           <ListFilter className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                        <div className="p-2">
                            <Input 
                                placeholder="Search statuses..." 
                                value={statusSearch} 
                                onChange={(e) => setStatusSearch(e.target.value)}
                                className="h-8"
                            />
                        </div>
                        <DropdownMenuSeparator />
                         {ALL_STATUSES.filter(s => s.toLowerCase().includes(statusSearch.toLowerCase())).map((s) => (
                            <DropdownMenuCheckboxItem
                                key={s}
                                checked={statusFilters.includes(s)}
                                onCheckedChange={() => handleStatusFilterChange(s)}
                            >
                                {s}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
              </div>
          </div>
        <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Preview</TableHead>
                <TableHead>Asset ID</TableHead>
                <TableHead>Content Score</TableHead>
                <TableHead>Content Type</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Creation Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Brand Safety</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssets.map((asset) => (
                <TableRow key={asset.id}>
                   <TableCell>
                     <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src={asset.thumbnail} data-ai-hint="creative thumbnail" />
                            <AvatarFallback>{asset.name?.charAt(0) || 'A'}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{asset.name}</span>
                     </div>
                  </TableCell>
                  <TableCell>
                      <div>
                          <div className="font-medium">{asset.contentSnId}</div>
                          {asset.id && <CopyableId id={asset.id} />}
                      </div>
                  </TableCell>
                  <TableCell>
                    {asset.contentScore !== undefined && (
                        <Badge variant={getScoreVariant(asset.contentScore).variant} className={cn("gap-1", getScoreVariant(asset.contentScore).className)}>
                            {asset.contentScore < 50 && <Lightbulb className="h-3 w-3" />}
                            {asset.contentScore}
                        </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{asset.contentType || 'N/A'}</Badge>
                  </TableCell>
                  <TableCell>{asset.type}</TableCell>
                  <TableCell>{asset.creationDate}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(asset.status)}>{asset.status || 'N/A'}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                     <Tooltip>
                        <TooltipTrigger>
                           {asset.brandSafety && !asset.brandSafety.isSafe ? (
                              <AlertTriangle className="h-5 w-5 text-destructive" />
                           ) : (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                           )}
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-semibold">Brand Safety Analysis</p>
                          {asset.brandSafety && !asset.brandSafety.isSafe ? (
                            <div className="text-destructive">
                              <p>Status: Needs Review</p>
                              <p>Flags: {asset.brandSafety.flags.join(', ')}</p>
                              <p>Reason: {asset.brandSafety.reasoning}</p>
                            </div>
                          ) : (
                             <p className="text-green-600">Status: Safe</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  );
}
