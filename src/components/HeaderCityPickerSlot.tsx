import { getSelectedCity } from "@/lib/location/getSelectedCity";
import { HeaderCityPicker } from "./HeaderCityPicker";

/**
 * Server component that reads the selected city cookie and renders the
 * client-side picker pre-hydrated with the correct value. Splitting the
 * cookie read out of the root layout keeps the layout's dynamic surface
 * scoped to this one slot.
 */
export async function HeaderCityPickerSlot() {
  const { city, source } = await getSelectedCity();
  return (
    <HeaderCityPicker
      initialSlug={city.slug}
      initialLabel={city.label}
      initialSource={source}
    />
  );
}
