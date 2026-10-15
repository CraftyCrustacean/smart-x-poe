import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { SEARCH_PATH, withChanges } from "../../lib/search";

export default function useSearchParamsState() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [urlParams, setUrlParams] = useSearchParams();
  const onSearchPage = pathname === SEARCH_PATH;
  const params = onSearchPage ? urlParams : new URLSearchParams();

  const update = (changes, options) => {
    if (onSearchPage)
      setUrlParams((prev) => withChanges(prev, changes, options), { replace: true });
    else {
      const next = withChanges(new URLSearchParams(), changes, options);
      navigate(`${SEARCH_PATH}${next.size ? `?${next}` : ""}`);
    }
  };

  return { params, update, onSearchPage };
}
