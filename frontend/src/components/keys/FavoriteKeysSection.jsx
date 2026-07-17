import KeyCard from "./KeyCard";
import { Star } from "lucide-react";

const FavoriteKeysSection = ({
	keys,
	onRequestKey,
	onToggleFavorite,
	// Bulk selection props
	selectedIds = null,
	onToggleSelect = null,
}) => {
	const bulkEnabled = selectedIds !== null && onToggleSelect !== null;

	return (
		<div className="mb-6 md:mb-8">
			<h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4 flex items-center gap-2">
				<Star className="w-4 h-4 md:w-5 md:h-5 text-yellow-400 fill-yellow-400" />
				My Favorite Keys
			</h3>
			
			{keys.length === 0 ? (
				<div className="text-center py-8 bg-white/5 rounded-xl border border-white/10">
					<Star className="w-12 h-12 text-gray-400 mx-auto mb-3" />
					<p className="text-gray-400 text-lg">You haven't added any favorite keys yet</p>
					<p className="text-gray-500 text-sm mt-1">
						Click the ⭐ icon on a key to add it
					</p>
				</div>
			) : (
				<div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
					{keys.map((key) => {
						const isSelected = bulkEnabled && selectedIds.has(key.id);
						const isAvailable = key.status === "available";
						const showCheckbox = bulkEnabled && isAvailable;

						return (
							<div key={key.id} className="flex-shrink-0 w-80 relative">
								{/* Checkbox — only on available keys when bulk mode active */}
								{showCheckbox && (
									<button
										onClick={() => onToggleSelect(key.id)}
										className={`absolute top-3 right-3 z-10 w-5 h-5 rounded border-2
											flex items-center justify-center flex-shrink-0 transition-colors ${
												isSelected
													? "bg-indigo-500 border-indigo-500"
													: "border-gray-500 bg-gray-800/80 hover:border-indigo-400"
											}`}
										title={isSelected ? "Deselect" : "Select for bulk checkout"}
									>
										{isSelected && (
											<svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
												<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
											</svg>
										)}
									</button>
								)}

								{/* Highlight ring when selected */}
								<div className={`rounded-2xl transition-all duration-200 ${
									isSelected ? "ring-2 ring-indigo-500/60" : ""
								}`}>
									<KeyCard
										keyData={key}
										variant="default"
										onRequestKey={onRequestKey}
										onToggleFavorite={onToggleFavorite}
										isFavorite={true}
										isSelected={isSelected}
									/>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};

export default FavoriteKeysSection;
