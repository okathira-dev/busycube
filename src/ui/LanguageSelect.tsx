import LanguageOutlined from "@mui/icons-material/LanguageOutlined";
import MenuItem, { menuItemClasses } from "@mui/material/MenuItem";
import { outlinedInputClasses } from "@mui/material/OutlinedInput";
import Select, {
  type SelectChangeEvent,
  selectClasses,
} from "@mui/material/Select";
import { styled } from "@mui/material/styles";
import type { Locale } from "../i18n";

const localeOptions: readonly { value: Locale; label: string }[] = [
  { value: "ja", label: "日本語" },
  { value: "en", label: "English" },
];

const StyledSelect = styled(Select)(({ theme }) => ({
  borderRadius: 999,
  color: theme.palette.text.secondary,
  background: "rgba(33, 26, 53, 0.8)",
  [`& .${outlinedInputClasses.notchedOutline}`]: {
    borderColor: "#665979",
  },
  [`&:hover .${outlinedInputClasses.notchedOutline}`]: {
    borderColor: "#a997c2",
  },
  [`&.${outlinedInputClasses.focused} .${outlinedInputClasses.notchedOutline}`]:
    {
      borderColor: theme.palette.secondary.main,
    },
  [`& .${selectClasses.select}`]: {
    display: "flex",
    alignItems: "center",
    paddingBlock: theme.spacing(1),
    paddingLeft: theme.spacing(1.5),
  },
}));

interface Props {
  locale: Locale;
  label: string;
  onChange(locale: Locale): void;
}

/** 言語が増えても、ヘッダーと設定画面で同じ選択肢・操作感を使う。 */
export function LanguageSelect({ locale, label, onChange }: Props) {
  const handleChange = (event: SelectChangeEvent<unknown>) => {
    const nextLocale = event.target.value;
    if (nextLocale === "ja" || nextLocale === "en") onChange(nextLocale);
  };

  return (
    <StyledSelect
      value={locale}
      onChange={handleChange}
      inputProps={{ "aria-label": label }}
      MenuProps={{
        slotProps: {
          paper: {
            sx: {
              mt: 0.5,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "#211a35",
              [`& .${menuItemClasses.root}:hover`]: { bgcolor: "#35294f" },
              [`& .${menuItemClasses.root}.${menuItemClasses.selected}`]: {
                bgcolor: "#493762",
              },
            },
          },
        },
      }}
      renderValue={(value) => {
        const selected = localeOptions.find((option) => option.value === value);
        return (
          <span className="language-select__value">
            <LanguageOutlined aria-hidden="true" />
            <span>{label}</span>
            <strong>{selected?.label}</strong>
          </span>
        );
      }}
    >
      {localeOptions.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </StyledSelect>
  );
}
