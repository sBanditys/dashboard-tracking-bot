
import { useAddBrand } from '@/hooks/use-tracking';
import { useState } from 'react';

interface AddBrandFormProps {
    guildId: string;
}

export function AddBrandForm({ guildId }: AddBrandFormProps) {
    const [label, setLabel] = useState('');
    const [slug, setSlug] = useState('');
    const addBrand = useAddBrand(guildId);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addBrand.mutate({
            label,
            slug: slug || undefined
        });
        setLabel('');
        setSlug('');
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-xl font-semibold">Add Brand</h2>
            <div>
                <label htmlFor="label" className="block text-sm font-medium">
                    Brand Label
                </label>
                <input
                    type="text"
                    id="label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
            </div>
            <div>
                <label htmlFor="slug" className="block text-sm font-medium">
                    Slug (optional)
                </label>
                <input
                    type="text"
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
            </div>
            <button
                type="submit"
                disabled={addBrand.isPending}
                className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
                {addBrand.isPending ? 'Adding...' : 'Add Brand'}
            </button>
        </form>
    );
}
