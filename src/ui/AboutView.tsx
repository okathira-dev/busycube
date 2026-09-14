import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { type Locale, messages } from "../i18n";

interface Props {
  headingId: string;
  locale: Locale;
}

/** ゲーム説明と関連文書への導線だけを担う、軽量な情報画面。 */
export function AboutView({ headingId, locale }: Props) {
  const copy = messages[locale];
  return (
    <Paper
      component="section"
      className="panel"
      aria-labelledby={headingId}
      variant="outlined"
    >
      <Stack spacing={2}>
        <Typography id={headingId} variant="h4" component="h2">
          {copy.about}
        </Typography>
        <Typography>{copy.aboutBody}</Typography>
        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 2 }}>
          <Link href={`./privacy/index.html?locale=${locale}`}>
            {copy.privacyPolicy}
          </Link>
          <Link href={`./terms/index.html?locale=${locale}`}>
            {copy.termsOfService}
          </Link>
          <Link href={`./licenses/index.html?locale=${locale}`}>
            {copy.thirdPartyLicenses}
          </Link>
        </Stack>
      </Stack>
    </Paper>
  );
}
