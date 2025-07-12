
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Sparkles, Loader2 } from 'lucide-react';
import TagInput from '@/components/admin/TagInput';

const formSchema = z.object({
  section_title: z.string().min(1, 'Section title is required'),
  section_content: z.string().min(1, 'Section content is required'),
  plain_english_summary: z.string().optional(),
  risk_level: z.enum(['low', 'medium', 'high']),
  category: z.string().min(1, 'Category is required'),
  order_index: z.number().min(0),
});

type FormData = z.infer<typeof formSchema>;

interface Policy {
  id: string;
  title: string;
  content: string;
  category: string;
}

interface PolicySection {
  id: string;
  section_title: string;
  section_content: string;
  plain_english_summary: string | null;
  risk_level: string;
  category: string;
  order_index: number;
}

interface PolicySectionFormProps {
  policy: Policy;
  section?: PolicySection | null;
  onClose: () => void;
}

const PolicySectionForm = ({ policy, section, onClose }: PolicySectionFormProps) => {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [aiAssisting, setAiAssisting] = useState(false);
  const [openaiApiKey, setOpenaiApiKey] = useState('');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      section_title: section?.section_title || '',
      section_content: section?.section_content || '',
      plain_english_summary: section?.plain_english_summary || '',
      risk_level: (section?.risk_level as 'low' | 'medium' | 'high') || 'medium',
      category: section?.category || policy.category,
      order_index: section?.order_index || 0,
    },
  });

  const handleAiAssist = async () => {
    const sectionContent = form.getValues('section_content');
    
    if (!sectionContent.trim()) {
      toast({
        title: "Error",
        description: "Please enter section content first",
        variant: "destructive",
      });
      return;
    }

    if (!openaiApiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your OpenAI API key to use AI assistance",
        variant: "destructive",
      });
      return;
    }

    setAiAssisting(true);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert at analyzing policy text. Provide a concise 2-3 sentence summary and suggest a risk level (low, medium, high) based on potential compliance issues. Respond in JSON format with "summary" and "risk_level" fields.',
            },
            {
              role: 'user',
              content: `Please analyze this policy section and provide a summary and risk assessment:\n\n${sectionContent}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 200,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI assistance');
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      try {
        const parsed = JSON.parse(aiResponse);
        
        if (parsed.summary) {
          form.setValue('plain_english_summary', parsed.summary);
        }
        
        if (parsed.risk_level && ['low', 'medium', 'high'].includes(parsed.risk_level)) {
          form.setValue('risk_level', parsed.risk_level);
        }

        toast({
          title: "AI Assistance Applied",
          description: "Summary and risk level have been suggested. Please review and edit as needed.",
        });
      } catch (parseError) {
        // Fallback: use the raw response as summary
        form.setValue('plain_english_summary', aiResponse);
        toast({
          title: "AI Assistance Applied",
          description: "Summary has been suggested. Please review and edit as needed.",
        });
      }
    } catch (error) {
      console.error('AI assist error:', error);
      toast({
        title: "AI Assistance Failed",
        description: "Unable to get AI suggestions. Please check your API key and try again.",
        variant: "destructive",
      });
    } finally {
      setAiAssisting(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      const sectionData = {
        policy_id: policy.id,
        section_title: data.section_title,
        section_content: data.section_content,
        plain_english_summary: data.plain_english_summary || null,
        risk_level: data.risk_level,
        category: data.category,
        order_index: data.order_index,
      };

      let result;
      if (section) {
        result = await supabase
          .from('policy_sections')
          .update(sectionData)
          .eq('id', section.id);
      } else {
        result = await supabase
          .from('policy_sections')
          .insert([sectionData]);
      }

      if (result.error) throw result.error;

      // Handle keywords if any
      if (keywords.length > 0 && result.data?.[0]?.id) {
        const keywordData = keywords.map(keyword => ({
          policy_section_id: result.data[0].id,
          keyword: keyword.trim(),
          risk_level: data.risk_level,
        }));

        const keywordResult = await supabase
          .from('policy_keywords')
          .insert(keywordData);

        if (keywordResult.error) {
          console.error('Error saving keywords:', keywordResult.error);
        }
      }

      toast({
        title: "Success",
        description: `Section ${section ? 'updated' : 'created'} successfully`,
      });

      onClose();
    } catch (error) {
      console.error('Error saving section:', error);
      toast({
        title: "Error",
        description: `Failed to ${section ? 'update' : 'create'} section`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          {section ? 'Edit Section' : 'Add New Section'}
        </h3>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>

      {/* OpenAI API Key Input */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <label className="text-sm font-medium mb-2 block">
          OpenAI API Key (for AI assistance)
        </label>
        <Input
          type="password"
          placeholder="sk-..."
          value={openaiApiKey}
          onChange={(e) => setOpenaiApiKey(e.target.value)}
          className="text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Your API key is only used for this session and is not stored.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="section_title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Section Title</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., Prohibited Items" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="section_content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Section Content</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Paste the policy section content here..."
                    className="min-h-[120px]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="plain_english_summary"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  Plain English Summary
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAiAssist}
                    disabled={aiAssisting}
                    className="h-6 px-2"
                  >
                    {aiAssisting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    AI Assist
                  </Button>
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="A simple explanation of what this section means..."
                    className="min-h-[80px]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="risk_level"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  Risk Level
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAiAssist}
                    disabled={aiAssisting}
                    className="h-6 px-2"
                  >
                    {aiAssisting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    AI Assist
                  </Button>
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Low Risk</SelectItem>
                    <SelectItem value="medium">Medium Risk</SelectItem>
                    <SelectItem value="high">High Risk</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., Seller Standards" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="order_index"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Order Index</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <label className="text-sm font-medium mb-2 block">Keywords</label>
            <TagInput
              tags={keywords}
              onTagsChange={setKeywords}
              placeholder="Add relevant keywords..."
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">
              {section ? 'Update Section' : 'Create Section'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default PolicySectionForm;
