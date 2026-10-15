import toast from "react-hot-toast";
import { useIssueCommand } from "../../api/commands";
import { commandLabel } from "../../lib/commands";

export function useSendCommand() {
  const issue = useIssueCommand();

  const send = (type, target, { onSuccess, onError = (e) => toast.error(e.message) } = {}) =>
    issue.mutate(
      { type, target },
      {
        onSuccess: (record) => {
          toast.success(`${commandLabel(type, target)}: ${record.deviceIds.length} device(s)`);
          onSuccess?.(record);
        },
        onError,
      },
    );

  return { ...issue, send };
}
