
import React, { useState } from 'react';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { Agency, AgencyRole } from '@/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { generateAgencyBioWithAI } from '@/services/geminiService';
import Spinner from '@/components/ui/Spinner';
import { ICONS } from '@/constants';

const CreateAgencyForm: React.FC = () => {
    const dispatch = useAppDispatch();
    const [name, setName] = useState('');
    const [tagline, setTagline] = useState('');

    const handleCreateAgency = (e: React.FormEvent) => {
        e.preventDefault();
        const newAgency: Agency = {
            id: `agency-${Date.now()}`,
            name,
            tagline,
            logoUrl: `https://via.placeholder.com/150/16a34a/ffffff?text=${name.charAt(0)}`,
            bio: 'Welcome to our new agency! Please update your bio.',
            ownerId: '', // Will be set in reducer
            members: [], // Will be set in reducer
            certifications: [],
            portfolio: [],
            location: '',
        };
        dispatch({ type: 'CREATE_AGENCY', payload: { agency: newAgency } });
    }
    
    return (
        <Card className="max-w-xl mx-auto p-8">
            <h2 className="text-2xl font-bold mb-2">Create Your Agency</h2>
            <p className="text-gray-600 mb-6">Start by giving your agency a name. You can fill in the rest of the details later.</p>
            <form onSubmit={handleCreateAgency} className="space-y-4">
                <Input label="Agency Name" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g., Pixel Perfect Inc." />
                <Input label="Tagline" value={tagline} onChange={e => setTagline(e.target.value)} required placeholder="e.g., Crafting Digital Experiences" />
                <div className="text-right">
                    <Button type="submit">Create Agency</Button>
                </div>
            </form>
        </Card>
    );
};

const AgencyManagementPage: React.FC = () => {
    const { currentUser, agencies } = useAppState();
    const dispatch = useAppDispatch();
    const agency = agencies.find(a => a.id === currentUser.agencyId);
    
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<Agency>>(agency || {});
    const [aiPrompt, setAiPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!currentUser.agencyId || !agency) {
        return <CreateAgencyForm />;
    }

    const canManage = currentUser.agencyRole === AgencyRole.Owner || currentUser.agencyRole === AgencyRole.Admin;

    if (!canManage) {
        return (
             <Card className="max-w-xl mx-auto p-8 text-center">
                <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                <p className="text-gray-600">You do not have permission to manage this agency's profile.</p>
            </Card>
        );
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = () => {
        dispatch({ type: 'UPDATE_AGENCY_PROFILE', payload: { agencyId: agency.id, data: formData } });
        setIsEditing(false);
    };
    
    const handleAiGenerate = async () => {
        if (!aiPrompt) return;
        setIsLoading(true);
        try {
            const newBio = await generateAgencyBioWithAI(aiPrompt);
            setFormData({ ...formData, bio: newBio });
        } catch (e) {
            console.error(e);
            alert("Failed to generate bio.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Manage Agency</h1>
            <Card className="p-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Agency Profile</h2>
                    {isEditing ? (
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => { setIsEditing(false); setFormData(agency); }}>Cancel</Button>
                            <Button onClick={handleSave}>Save Changes</Button>
                        </div>
                    ) : (
                        <Button variant="outline" onClick={() => setIsEditing(true)}>Edit Profile</Button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="Agency Name" name="name" value={formData.name || ''} onChange={handleInputChange} disabled={!isEditing} />
                    <Input label="Tagline" name="tagline" value={formData.tagline || ''} onChange={handleInputChange} disabled={!isEditing} />
                    <Input label="Location" name="location" value={formData.location || ''} onChange={handleInputChange} disabled={!isEditing} />
                    <Input label="Logo URL" name="logoUrl" value={formData.logoUrl || ''} onChange={handleInputChange} disabled={!isEditing} />
                    
                    <div className="md:col-span-2">
                        <Textarea label="Biography" name="bio" value={formData.bio || ''} onChange={handleInputChange} disabled={!isEditing} rows={8} />
                        {isEditing && (
                             <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mt-2">
                                <h3 className="font-semibold text-primary-800 mb-2">Generate Bio with AI</h3>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <Input
                                        value={aiPrompt}
                                        onChange={(e) => setAiPrompt(e.target.value)}
                                        placeholder="e.g., a web design agency focused on e-commerce"
                                        disabled={isLoading}
                                        wrapperClassName="flex-grow"
                                    />
                                    <Button onClick={handleAiGenerate} disabled={isLoading} className="sm:w-auto w-full flex-shrink-0">
                                        {isLoading ? <Spinner size="sm" /> : <>{ICONS.SPARKLES} <span className="ml-2">Generate</span></>}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Card>
            
            <Card className="p-8">
                 <h2 className="text-2xl font-bold mb-6">Team Members</h2>
                 <p className="text-center text-gray-500">Team member management coming soon.</p>
            </Card>
        </div>
    );
};

export default AgencyManagementPage;
