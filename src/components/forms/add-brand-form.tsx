
import { useAddBrand } from '@/hooks/use-tracking';
import { useState } from 'react';

interface AddBrandFormProps {
    guildId: string;
}

export function AddBrandForm({ guildId }: AddBrandFormProps) {
    const [name, setName] = useState('');
    const addBrand = useAddBrand(guildId);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addBrand.mutate({ name });
        setName('');
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-xl font-semibold">Add Brand</h2>
            <div>
                <label htmlFor="name" className="block text-sm font-medium">
                    Brand Name
                </label>
                <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
